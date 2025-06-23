import React, {
  createContext,
  useState,
  useEffect,
  ReactNode,
  useContext,
  useCallback,
} from 'react';
import { supabase } from '../supabaseClient';
import { OrderType, UserSession, OrderStatus, Product } from '../types';
import { ADMIN_EMAIL } from '../constants';

interface AppContextType {
  userSession: UserSession | null;
  login: (email: string, storeName: string) => void;
  logout: () => void;
  isAdmin: boolean;
  orders: OrderType[];
  addOrder: (order: Omit<OrderType, 'id' | 'orderDate' | 'status'>) => OrderType;
  updateOrderStatus: (orderId: string, status: OrderStatus) => void;
  products: Product[];
  getProductById: (productId: string) => Product | undefined;
  addProduct: (productData: Omit<Product, 'id'>) => Promise<Product | null>;
  updateProduct: (
    productId: string,
    updatedProductData: Partial<Omit<Product, 'id'>>
  ) => Promise<void>;
  deleteProduct: (productId: string) => Promise<void>;
  bulkAddProducts: (productsToAdd: Partial<Product>[]) => void;
  isLoading: boolean;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [userSession, setUserSession] = useState<UserSession | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [orders, setOrders] = useState<OrderType[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchInitialData = async () => {
      setIsLoading(true);

      const storedUser = localStorage.getItem('userSession');
      if (storedUser) {
        const session = JSON.parse(storedUser) as UserSession;
        setUserSession(session);
        setIsAdmin(session.email === ADMIN_EMAIL);
      }

      const { data, error } = await supabase.from('products').select('*');
      if (error) {
        console.error('Failed to fetch products:', error);
        setProducts([]);
      } else {
        setProducts(data || []);
      }

      setIsLoading(false);
    };

    fetchInitialData();
  }, []);

  const login = useCallback((email: string, storeName: string) => {
    const session = { email, storeName };
    setUserSession(session);
    setIsAdmin(email === ADMIN_EMAIL);
    localStorage.setItem('userSession', JSON.stringify(session));
  }, []);

  const logout = useCallback(() => {
    setUserSession(null);
    setIsAdmin(false);
    localStorage.removeItem('userSession');
  }, []);

  const addOrder = useCallback(
    (newOrderData: Omit<OrderType, 'id' | 'orderDate' | 'status'>): OrderType => {
      const newOrder: OrderType = {
        ...newOrderData,
        id: `order_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        orderDate: new Date().toISOString(),
        status: OrderStatus.PENDING,
      };
      setOrders(prev => [...prev, newOrder]);
      return newOrder;
    },
    []
  );

  const updateOrderStatus = useCallback((orderId: string, status: OrderStatus) => {
    setOrders(prev => prev.map(o => (o.id === orderId ? { ...o, status } : o)));
  }, []);

  const getProductById = useCallback(
    (productId: string): Product | undefined => {
      return products.find(p => p.id === productId);
    },
    [products]
  );

  const addProduct = useCallback(
    async (productData: Omit<Product, 'id'>): Promise<Product | null> => {
      const { data, error } = await supabase
        .from('products')
        .insert([productData])
        .select()
        .single();

      if (error) {
        console.error('Error adding product to Supabase:', error);
        return null;
      }

      setProducts(prev => [...prev, data]);
      return data;
    },
    []
  );

  const updateProduct = useCallback(
    async (
      productId: string,
      updatedProductData: Partial<Omit<Product, 'id'>>
    ): Promise<void> => {
      const { error } = await supabase
        .from('products')
        .update(updatedProductData)
        .eq('id', productId);

      if (error) {
        console.error('Error updating product in Supabase:', error);
        return;
      }

      setProducts(prev =>
        prev.map(p => (p.id === productId ? { ...p, ...updatedProductData } : p))
      );
    },
    []
  );

  const deleteProduct = useCallback(async (productId: string): Promise<void> => {
    const { error } = await supabase.from('products').delete().eq('id', productId);

    if (error) {
      console.error('Error deleting product from Supabase:', error);
      return;
    }

    setProducts(prev => prev.filter(p => p.id !== productId));
  }, []);

  const bulkAddProducts = useCallback((productsToAdd: Partial<Product>[]) => {
    // Optional: You could implement Supabase batch insert here
    setProducts(prev => {
      const map = new Map(prev.map(p => [p.id, p]));
      productsToAdd.forEach(p => {
        const id = p.id || `prod_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        const fullProduct: Product = {
          id,
          name: p.name || 'Unnamed Product',
          imageUrl: p.imageUrl || 'https://picsum.photos/seed/default/200/200',
          price: p.price ?? 0,
          quantityType: p.quantityType || 'unit',
          stock: p.stock ?? 0,
          description: p.description || '',
          barcode: p.barcode || '',
        };
        map.set(id, fullProduct);
      });
      return Array.from(map.values());
    });
  }, []);

  return (
    <AppContext.Provider
      value={{
        userSession,
        login,
        logout,
        isAdmin,
        orders,
        addOrder,
        updateOrderStatus,
        products,
        getProductById,
        addProduct,
        updateProduct,
        deleteProduct,
        bulkAddProducts,
        isLoading,
      }}
    >
      {isLoading ? (
        <div className="flex justify-center items-center h-screen">
          <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      ) : (
        children
      )}
    </AppContext.Provider>
  );
};

export const useAppContext = (): AppContextType => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};
