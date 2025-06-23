
import React, { createContext, useState, useEffect, ReactNode, useContext, useCallback } from 'react';
import { OrderType, UserSession, OrderStatus, Product } from '../types';
import { INITIAL_PRODUCTS, ADMIN_EMAIL } from '../constants';

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
  addProduct: (productData: Omit<Product, 'id'>) => Product;
  updateProduct: (productId: string, updatedProductData: Partial<Omit<Product, 'id'>>) => void;
  deleteProduct: (productId: string) => void;
  bulkAddProducts: (productsToAdd: Partial<Product>[]) => void; // New function
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
    setIsLoading(true);
    try {
      const storedUser = localStorage.getItem('userSession');
      if (storedUser) {
        const session: UserSession = JSON.parse(storedUser);
        setUserSession(session);
        setIsAdmin(session.email === ADMIN_EMAIL);
      } else {
        setIsAdmin(false);
      }

      const storedOrders = localStorage.getItem('orders');
      if (storedOrders) {
        setOrders(JSON.parse(storedOrders));
      }

      const storedProducts = localStorage.getItem('products');
      if (storedProducts) {
        setProducts(JSON.parse(storedProducts));
      } else {
        setProducts(INITIAL_PRODUCTS);
        localStorage.setItem('products', JSON.stringify(INITIAL_PRODUCTS));
      }
    } catch (error) {
      console.error("Error loading data from localStorage:", error);
      // Fallback for products if corrupted
      if (products.length === 0 && !localStorage.getItem('products')) { // Check if products is empty AND not in localStorage
        setProducts(INITIAL_PRODUCTS);
        localStorage.setItem('products', JSON.stringify(INITIAL_PRODUCTS));
      }
    }
    setIsLoading(false);
  }, []); // products removed from dependency array to avoid loop if localStorage is corrupted.

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

  const addOrder = useCallback((newOrderData: Omit<OrderType, 'id' | 'orderDate' | 'status'>): OrderType => {
    const newOrder: OrderType = {
      ...newOrderData,
      id: `order_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      orderDate: new Date().toISOString(),
      status: OrderStatus.PENDING,
    };
    setOrders(prevOrders => {
      const updatedOrders = [...prevOrders, newOrder];
      localStorage.setItem('orders', JSON.stringify(updatedOrders));
      return updatedOrders;
    });
    return newOrder;
  }, []);

  const updateOrderStatus = useCallback((orderId: string, status: OrderStatus) => {
    setOrders(prevOrders => {
      const updatedOrders = prevOrders.map(o => o.id === orderId ? { ...o, status } : o);
      localStorage.setItem('orders', JSON.stringify(updatedOrders));
      return updatedOrders;
    });
  }, []);

  const getProductById = useCallback((productId: string): Product | undefined => {
    return products.find(p => p.id === productId);
  }, [products]);

  const addProduct = useCallback((productData: Omit<Product, 'id'>): Product => {
    const newProduct: Product = {
      ...productData,
      id: `prod_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    };
    setProducts(prevProducts => {
      const updatedProducts = [...prevProducts, newProduct];
      localStorage.setItem('products', JSON.stringify(updatedProducts));
      return updatedProducts;
    });
    return newProduct;
  }, []);

  const updateProduct = useCallback((productId: string, updatedProductData: Partial<Omit<Product, 'id'>>) => {
    setProducts(prevProducts => {
      const updatedProducts = prevProducts.map(p =>
        p.id === productId ? { ...p, ...updatedProductData } : p
      );
      localStorage.setItem('products', JSON.stringify(updatedProducts));
      return updatedProducts;
    });
  }, []);

  const deleteProduct = useCallback((productId: string) => {
    setProducts(prevProducts => {
      const updatedProducts = prevProducts.filter(p => p.id !== productId);
      localStorage.setItem('products', JSON.stringify(updatedProducts));
      return updatedProducts;
    });
  }, []);

  const bulkAddProducts = useCallback((productsToAdd: Partial<Product>[]) => {
    setProducts(prevProducts => {
      const productMap = new Map(prevProducts.map(p => [p.id, p]));
      
      productsToAdd.forEach(pToAdd => {
        if (pToAdd.id && productMap.has(pToAdd.id)) {
          // Update existing product
          productMap.set(pToAdd.id, { ...productMap.get(pToAdd.id)!, ...pToAdd } as Product);
        } else {
          // Add new product
          const newId = pToAdd.id || `prod_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
          const fullNewProduct: Product = {
            name: '', // Default values, should be overridden by pToAdd
            imageUrl: '',
            ...pToAdd, // Spread the partial product data
            id: newId, // Ensure it has an ID
          };
          productMap.set(newId, fullNewProduct);
        }
      });
      
      const updatedProductsArray = Array.from(productMap.values());
      localStorage.setItem('products', JSON.stringify(updatedProductsArray));
      return updatedProductsArray;
    });
  }, []);


  return (
    <AppContext.Provider value={{ 
      userSession, login, logout, isAdmin,
      orders, addOrder, updateOrderStatus, 
      products, getProductById, addProduct, updateProduct, deleteProduct, bulkAddProducts,
      isLoading 
    }}>
      {!isLoading && children}
      {isLoading && <div className="flex justify-center items-center h-screen"><div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-blue-500"></div></div>}
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
