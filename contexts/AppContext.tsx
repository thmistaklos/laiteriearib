import React, { createContext, useState, useEffect, ReactNode, useContext, useCallback } from 'react';
import { OrderType, UserSession, OrderStatus, Product } from '../types';
import { INITIAL_PRODUCTS, ADMIN_EMAIL } from '../constants';
import { supabase } from '../supabaseClient'; // Import Supabase client

// Helper to generate UUIDs for session IDs
function uuidv4() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}


interface AppContextType {
  userSession: UserSession | null;
  login: (email: string, storeName: string) => Promise<void>;
  logout: () => Promise<void>;
  isAdmin: boolean;
  orders: OrderType[];
  addOrder: (order: Omit<OrderType, 'id' | 'orderDate' | 'status'>) => Promise<OrderType | null>;
  updateOrderStatus: (orderId: string, status: OrderStatus) => Promise<void>;
  products: Product[];
  getProductById: (productId: string) => Product | undefined;
  addProduct: (productData: Omit<Product, 'id'>) => Promise<Product | null>;
  updateProduct: (productId: string, updatedProductData: Partial<Omit<Product, 'id'>>) => Promise<void>;
  deleteProduct: (productId: string) => Promise<void>;
  bulkAddProducts: (productsToAdd: Partial<Product>[]) => Promise<void>;
  isLoading: boolean;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const SESSION_STORAGE_KEY = 'supabaseSessionId';

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [userSession, setUserSession] = useState<UserSession | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [orders, setOrders] = useState<OrderType[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchAllData = useCallback(async (currentSessionId?: string) => {
    setIsLoading(true);
    let sessionIsValid = false;

    // 1. Attempt to load user session
    if (currentSessionId) {
      try {
        const { data: sessionData, error: sessionError } = await supabase
          .from('sessions')
          .select('email, store_name')
          .eq('id', currentSessionId)
          .single();

        if (sessionError || !sessionData) {
          if (sessionError && sessionError.code !== 'PGRST116') { // PGRST116: single row not found
             console.error('Error fetching session - message:', sessionError.message, "Details:", sessionError);
          }
          localStorage.removeItem(SESSION_STORAGE_KEY);
          setUserSession(null);
          setIsAdmin(false);
        } else {
          const session = { email: sessionData.email, storeName: sessionData.store_name };
          setUserSession(session);
          setIsAdmin(session.email === ADMIN_EMAIL);
          sessionIsValid = true;
          // Update last_active_at
          await supabase.from('sessions').update({ last_active_at: new Date().toISOString() }).eq('id', currentSessionId);
        }
      } catch (error) {
        console.error("Error processing session:", (error as Error).message || error);
        localStorage.removeItem(SESSION_STORAGE_KEY);
        setUserSession(null);
        setIsAdmin(false);
      }
    } else {
        setUserSession(null);
        setIsAdmin(false);
    }


    // 2. Fetch products
    try {
      const { data: dbProducts, error: productError } = await supabase.from('products').select('*');
      if (productError) {
        console.error("Error fetching products - message:", productError.message, "Details:", productError);
        setProducts(INITIAL_PRODUCTS); // Fallback
      } else if (!dbProducts || dbProducts.length === 0) {
        console.log("No products in DB, seeding...");
        const { error: seedError } = await supabase.from('products').insert(INITIAL_PRODUCTS.map(p => ({...p}))); // Ensure it's a new object array
        if (seedError) {
          console.error("Error seeding products - message:", seedError.message, "Details:", seedError);
          setProducts(INITIAL_PRODUCTS); // Fallback if seed fails
        } else {
          setProducts(INITIAL_PRODUCTS);
        }
      } else {
        setProducts(dbProducts);
      }
    } catch (error) {
      console.error("Critical error fetching products:", (error as Error).message || error);
      setProducts(INITIAL_PRODUCTS); // Fallback
    }

    // 3. Fetch orders
    try {
      const { data: dbOrders, error: orderError } = await supabase.from('orders').select('*');
      if (orderError) {
        console.error("Error fetching orders - message:", orderError.message, "Details:", orderError);
        setOrders([]);
      } else {
        setOrders(dbOrders || []);
      }
    } catch (error) {
      console.error("Critical error fetching orders:", (error as Error).message || error);
      setOrders([]);
    }

    setIsLoading(false);
    return sessionIsValid;
  }, []);


  useEffect(() => {
    const storedSessionId = localStorage.getItem(SESSION_STORAGE_KEY);
    fetchAllData(storedSessionId || undefined);
  }, [fetchAllData]);

  const login = useCallback(async (email: string, storeName: string) => {
    setIsLoading(true);
    const sessionId = uuidv4();
    const sessionToSave = { email, storeName };

    const { error } = await supabase.from('sessions').insert({
      id: sessionId,
      email: email,
      store_name: storeName,
      last_active_at: new Date().toISOString(),
    });

    if (error) {
      console.error('Login error - Supabase insert session failed - message:', error.message, "Details:", error);
      setIsLoading(false);
      return;
    }

    localStorage.setItem(SESSION_STORAGE_KEY, sessionId);
    setUserSession(sessionToSave);
    setIsAdmin(email === ADMIN_EMAIL);
    setIsLoading(false);
  }, []);

  const logout = useCallback(async () => {
    setIsLoading(true);
    const sessionId = localStorage.getItem(SESSION_STORAGE_KEY);
    if (sessionId) {
      const { error } = await supabase.from('sessions').delete().eq('id', sessionId);
      if (error) {
        console.error('Logout error - Supabase delete session failed - message:', error.message, "Details:", error);
      }
      localStorage.removeItem(SESSION_STORAGE_KEY);
    }
    setUserSession(null);
    setIsAdmin(false);
    setOrders([]); 
    setIsLoading(false);
  }, []);

  const addOrder = useCallback(async (newOrderData: Omit<OrderType, 'id' | 'orderDate' | 'status'>): Promise<OrderType | null> => {
    setIsLoading(true);
    const orderId = `order_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const fullOrder: OrderType = {
      ...newOrderData,
      id: orderId,
      orderDate: new Date().toISOString(),
      status: OrderStatus.PENDING,
    };

    const { data, error } = await supabase.from('orders').insert(fullOrder).select().single();
    
    if (error) {
      console.error("Error adding order to Supabase - message:", error.message, "Details:", error);
      setIsLoading(false);
      return null;
    }
    if (data) {
      setOrders(prevOrders => [...prevOrders, data]);
    }
    setIsLoading(false);
    return data;
  }, []);

  const updateOrderStatus = useCallback(async (orderId: string, status: OrderStatus) => {
    setIsLoading(true);
    const { error } = await supabase.from('orders').update({ status }).eq('id', orderId);
    if (error) {
      console.error("Error updating order status in Supabase - message:", error.message, "Details:", error);
    } else {
      setOrders(prevOrders => prevOrders.map(o => o.id === orderId ? { ...o, status } : o));
    }
    setIsLoading(false);
  }, []);

  const getProductById = useCallback((productId: string): Product | undefined => {
    return products.find(p => p.id === productId);
  }, [products]);

  const addProduct = useCallback(async (productData: Omit<Product, 'id'>): Promise<Product | null> => {
    setIsLoading(true);
    const newProduct: Product = {
      ...productData,
      id: `prod_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    };
    
    const { data, error } = await supabase.from('products').insert(newProduct).select().single();

    if (error) {
      console.error("Error adding product to Supabase - message:", error.message, "Details:", error);
      setIsLoading(false);
      return null;
    }
    if (data) {
       setProducts(prevProducts => [...prevProducts, data]);
    }
    setIsLoading(false);
    return data;
  }, []);

  const updateProduct = useCallback(async (productId: string, updatedProductData: Partial<Omit<Product, 'id'>>) => {
    setIsLoading(true);
    const { data, error } = await supabase.from('products').update(updatedProductData).eq('id', productId).select().single();
    if (error) {
      console.error("Error updating product in Supabase - message:", error.message, "Details:", error);
    } else if (data) {
      setProducts(prevProducts => prevProducts.map(p => p.id === productId ? data : p));
    }
    setIsLoading(false);
  }, []);

  const deleteProduct = useCallback(async (productId: string) => {
    setIsLoading(true);
    const { error } = await supabase.from('products').delete().eq('id', productId);
    if (error) {
      console.error("Error deleting product from Supabase - message:", error.message, "Details:", error);
    } else {
      setProducts(prevProducts => prevProducts.filter(p => p.id !== productId));
    }
    setIsLoading(false);
  }, []);

  const bulkAddProducts = useCallback(async (productsToAdd: Partial<Product>[]) => {
    setIsLoading(true);
    
    const productsToUpsert = productsToAdd.map(pToAdd => {
        const fullProductData: Product = {
            id: pToAdd.id || `prod_${Date.now()}_${Math.random().toString(36).substring(2, 9)}_${Math.random().toString(36).substring(2, 9)}`, 
            name: pToAdd.name || 'Unnamed Product',
            description: pToAdd.description || '',
            price: pToAdd.price === undefined ? 0 : pToAdd.price,
            imageUrl: pToAdd.imageUrl || 'https://picsum.photos/seed/defaultproduct/200/200',
            barcode: pToAdd.barcode || '',
            quantityType: pToAdd.quantityType || 'unit',
            stock: pToAdd.stock === undefined ? 0 : pToAdd.stock,
            ...pToAdd, 
        };
        return fullProductData;
    });

    const { error: upsertError } = await supabase.from('products').upsert(productsToUpsert, { onConflict: 'id' });

    if (upsertError) {
        console.error("Error bulk adding/updating products in Supabase - message:", upsertError.message, "Details:", upsertError);
    }
    
    const { data: allProductsData, error: fetchError } = await supabase.from('products').select('*');
    if (fetchError) {
        console.error("Error re-fetching products after bulk add - message:", fetchError.message, "Details:", fetchError);
    } else if (allProductsData) {
        setProducts(allProductsData);
    }

    setIsLoading(false);
  }, []);


  return (
    <AppContext.Provider value={{ 
      userSession, login, logout, isAdmin,
      orders, addOrder, updateOrderStatus, 
      products, getProductById, addProduct, updateProduct, deleteProduct, bulkAddProducts,
      isLoading 
    }}>
      {isLoading && !children ? (
        <div className="flex justify-center items-center h-screen">
          <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      ) : children}
    </AppContext.Provider>
  );
};

export const useAppContext = (): AppContextType => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};