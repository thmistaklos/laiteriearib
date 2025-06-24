
import React, { createContext, useState, useEffect, ReactNode, useContext, useCallback } from 'react';
import { OrderType, UserSession, OrderStatus, Product, OrderItemType } from '../types';
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
  showAdminOrderNotification: boolean;
  markAdminDashboardViewed: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const SESSION_STORAGE_KEY = 'supabaseSessionId';
const ADMIN_LAST_DASHBOARD_VIEW_TIMESTAMP_KEY = 'adminLastDashboardViewTimestamp';

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [userSession, setUserSession] = useState<UserSession | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [orders, setOrders] = useState<OrderType[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAdminOrderNotification, setShowAdminOrderNotification] = useState(false);

  const checkAdminNotification = useCallback(() => {
    if (isAdmin) {
      const lastViewTimestamp = localStorage.getItem(ADMIN_LAST_DASHBOARD_VIEW_TIMESTAMP_KEY);
      const hasNewPendingOrders = orders.some(order => 
        order.status === OrderStatus.PENDING && 
        (!lastViewTimestamp || new Date(order.orderDate).getTime() > new Date(lastViewTimestamp).getTime())
      );
      setShowAdminOrderNotification(hasNewPendingOrders);
    } else {
      setShowAdminOrderNotification(false);
    }
  }, [orders, isAdmin]);

  useEffect(() => {
    checkAdminNotification();
  }, [checkAdminNotification]);


  const fetchAllData = useCallback(async (currentSessionId?: string) => {
    setIsLoading(true);
    let sessionIsValid = false;

    if (currentSessionId) {
      try {
        const { data: sessionData, error: sessionError } = await supabase
          .from('sessions')
          .select('email, store_name')
          .eq('id', currentSessionId)
          .single();

        if (sessionError || !sessionData) {
          if (sessionError && sessionError.code !== 'PGRST116') {
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

    try {
      const { data: dbProducts, error: productError } = await supabase.from('products').select('*');
      if (productError) {
        console.error("Error fetching products - message:", productError.message, "Details:", productError);
        setProducts(INITIAL_PRODUCTS.map(p => ({...p, isVisible: p.isVisible === undefined ? true : p.isVisible }))); 
      } else if (!dbProducts || dbProducts.length === 0) {
        console.log("No products in DB, seeding...");
        const seedProducts = INITIAL_PRODUCTS.map(p => ({...p, isVisible: p.isVisible === undefined ? true : p.isVisible }));
        const { error: seedError } = await supabase.from('products').insert(seedProducts); 
        if (seedError) {
          console.error("Error seeding products - message:", seedError.message, "Details:", seedError);
          setProducts(INITIAL_PRODUCTS.map(p => ({...p, isVisible: p.isVisible === undefined ? true : p.isVisible }))); 
        } else {
          setProducts(INITIAL_PRODUCTS.map(p => ({...p, isVisible: p.isVisible === undefined ? true : p.isVisible })));
        }
      } else {
        setProducts(dbProducts.map(p => ({...p, isVisible: p.isVisible === undefined || p.isVisible === null ? true : p.isVisible })));
      }
    } catch (error) {
      console.error("Critical error fetching products:", (error as Error).message || error);
      setProducts(INITIAL_PRODUCTS.map(p => ({...p, isVisible: p.isVisible === undefined ? true : p.isVisible }))); 
    }

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
    await fetchAllData(sessionId); 
    setIsLoading(false);
  }, [fetchAllData]);

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

  const updateOrderStatus = useCallback(async (orderId: string, newStatus: OrderStatus) => {
    setIsLoading(true);
    const orderToUpdate = orders.find(o => o.id === orderId);
    if (!orderToUpdate) {
      console.error("Order not found for status update:", orderId);
      setIsLoading(false);
      return;
    }

    const oldStatus = orderToUpdate.status;

    const { error } = await supabase.from('orders').update({ status: newStatus }).eq('id', orderId);
    if (error) {
      console.error("Error updating order status in Supabase - message:", error.message, "Details:", error);
    } else {
      setOrders(prevOrders => prevOrders.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
      
      // Stock adjustment logic
      if (newStatus === OrderStatus.DELIVERED && oldStatus !== OrderStatus.DELIVERED) {
        console.log(`Order ${orderId} DELIVERED. Adjusting stock.`);
        const productUpdates: PromiseLike<any>[] = []; // Changed Promise<any>[] to PromiseLike<any>[]
        const updatedProductsLocally: Product[] = [];

        for (const item of orderToUpdate.items) {
          const product = products.find(p => p.id === item.product.id);
          if (product && typeof product.stock === 'number') {
            const newStock = Math.max(0, product.stock - item.quantity); // Prevent negative stock visually
            productUpdates.push(
              supabase.from('products').update({ stock: newStock }).eq('id', product.id)
            );
            updatedProductsLocally.push({ ...product, stock: newStock });
          } else {
             console.warn(`Product ${item.product.id} not found or stock undefined for order ${orderId}`);
          }
        }
        
        try {
          await Promise.all(productUpdates);
          // Update local products state
          setProducts(prevProducts => {
            return prevProducts.map(p => {
              const updatedVersion = updatedProductsLocally.find(up => up.id === p.id);
              return updatedVersion || p;
            });
          });
          console.log(`Stock updated for order ${orderId}`);
        } catch (stockUpdateError) {
          console.error("Error updating product stocks in Supabase - message:", (stockUpdateError as Error).message, "Details:", stockUpdateError);
          // Potentially revert order status or notify admin of stock update failure
        }
      }
    }
    setIsLoading(false);
  }, [orders, products]);

  const getProductById = useCallback((productId: string): Product | undefined => {
    return products.find(p => p.id === productId);
  }, [products]);

  const addProduct = useCallback(async (productData: Omit<Product, 'id'>): Promise<Product | null> => {
    setIsLoading(true);
    const newProduct: Product = {
      ...productData,
      id: `prod_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      isVisible: productData.isVisible === undefined ? true : productData.isVisible,
    };
    
    const { data, error } = await supabase.from('products').insert(newProduct).select().single();

    if (error) {
      console.error("Error adding product to Supabase - message:", error.message, "Details:", error);
      setIsLoading(false);
      return null;
    }
    if (data) {
       setProducts(prevProducts => [...prevProducts, {...data, isVisible: data.isVisible === undefined || data.isVisible === null ? true : data.isVisible} as Product]);
    }
    setIsLoading(false);
    return data ? {...data, isVisible: data.isVisible === undefined || data.isVisible === null ? true : data.isVisible} as Product : null;
  }, []);

  const updateProduct = useCallback(async (productId: string, updatedProductData: Partial<Omit<Product, 'id'>>) => {
    setIsLoading(true);
    const productToUpdate = { ...updatedProductData };
    // Ensure isVisible is explicitly set if passed, otherwise it might be removed by Partial
    if (updatedProductData.isVisible !== undefined) {
      productToUpdate.isVisible = updatedProductData.isVisible;
    }

    const { data, error } = await supabase.from('products').update(productToUpdate).eq('id', productId).select().single();
    if (error) {
      console.error("Error updating product in Supabase - message:", error.message, "Details:", error);
    } else if (data) {
      setProducts(prevProducts => prevProducts.map(p => p.id === productId ? {...data, isVisible: data.isVisible === undefined || data.isVisible === null ? true : data.isVisible} as Product : p));
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
        const finalProduct: Product = {
            id: pToAdd.id || `prod_${Date.now()}_${Math.random().toString(36).substring(2, 9)}_${Math.random().toString(36).substring(2, 9)}`,
            name: pToAdd.name || 'Unnamed Product',
            description: pToAdd.description || '',
            price: Number(pToAdd.price ?? 0), // Ensures price is a number, defaults to 0 if pToAdd.price is null/undefined
            imageUrl: pToAdd.imageUrl || 'https://picsum.photos/seed/defaultproduct/200/200',
            barcode: pToAdd.barcode || '',
            quantityType: pToAdd.quantityType || 'unit',
            stock: Number(pToAdd.stock ?? 0), // Ensures stock is a number, defaults to 0 if pToAdd.stock is null/undefined
            isVisible: typeof pToAdd.isVisible === 'boolean' ? pToAdd.isVisible : true, // Ensures isVisible is boolean, defaults to true
        };
        return finalProduct;
    });

    const { error: upsertError } = await supabase.from('products').upsert(productsToUpsert, { onConflict: 'id' });

    if (upsertError) {
        console.error("Error bulk adding/updating products in Supabase - message:", upsertError.message, "Details:", upsertError);
    }
    
    // Re-fetch all products to ensure local state is consistent with DB after upsert
    const { data: allProductsData, error: fetchError } = await supabase.from('products').select('*');
    if (fetchError) {
        console.error("Error re-fetching products after bulk add - message:", fetchError.message, "Details:", fetchError);
    } else if (allProductsData) {
        setProducts(allProductsData.map(p => ({...p, isVisible: p.isVisible === undefined || p.isVisible === null ? true : p.isVisible })));
    }

    setIsLoading(false);
  }, []);

  const markAdminDashboardViewed = useCallback(() => {
    if (isAdmin) {
      localStorage.setItem(ADMIN_LAST_DASHBOARD_VIEW_TIMESTAMP_KEY, new Date().toISOString());
      setShowAdminOrderNotification(false);
    }
  }, [isAdmin]);


  return (
    <AppContext.Provider value={{ 
      userSession, login, logout, isAdmin,
      orders, addOrder, updateOrderStatus, 
      products, getProductById, addProduct, updateProduct, deleteProduct, bulkAddProducts,
      isLoading,
      showAdminOrderNotification,
      markAdminDashboardViewed
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
