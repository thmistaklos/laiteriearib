
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
  bulkAddProducts: (productsToAdd: Partial<Product>[]) => void;
  isLoading: boolean;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const SIMULATED_API_DELAY = 500; // ms

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [userSession, setUserSession] = useState<UserSession | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [orders, setOrders] = useState<OrderType[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchInitialData = async () => {
      setIsLoading(true);

      // Simulate fetching user session
      try {
        await new Promise(resolve => setTimeout(resolve, SIMULATED_API_DELAY / 2)); // Shorter delay for session
        const storedUser = localStorage.getItem('userSession');
        if (storedUser) {
          const session = JSON.parse(storedUser) as UserSession;
          setUserSession(session);
          setIsAdmin(session.email === ADMIN_EMAIL);
        } else {
          setIsAdmin(false);
          setUserSession(null);
        }
      } catch (error) {
        console.error("Error loading user session from localStorage:", error);
        localStorage.removeItem('userSession');
        setUserSession(null);
        setIsAdmin(false);
      }

      // Simulate fetching orders
      try {
        await new Promise(resolve => setTimeout(resolve, SIMULATED_API_DELAY));
        const storedOrders = localStorage.getItem('orders');
        if (storedOrders) {
          setOrders(JSON.parse(storedOrders));
        } else {
          setOrders([]); // Default to empty array if no orders stored
        }
      } catch (error) {
        console.error("Error loading orders from localStorage:", error);
        localStorage.removeItem('orders');
        setOrders([]);
      }

      // Simulate fetching products
      try {
        await new Promise(resolve => setTimeout(resolve, SIMULATED_API_DELAY));
        const storedProducts = localStorage.getItem('products');
        if (storedProducts && storedProducts !== "[]" && storedProducts !== "null") {
          const parsedProducts = JSON.parse(storedProducts);
          if (Array.isArray(parsedProducts) && parsedProducts.length > 0) {
            setProducts(parsedProducts);
          } else {
            console.warn("Stored products data is not a valid array or is empty. Resetting to initial products.");
            setProducts(INITIAL_PRODUCTS);
            localStorage.setItem('products', JSON.stringify(INITIAL_PRODUCTS));
          }
        } else {
          setProducts(INITIAL_PRODUCTS);
          localStorage.setItem('products', JSON.stringify(INITIAL_PRODUCTS));
        }
      } catch (error) {
        console.error("Error parsing products from localStorage or other product loading error:", error);
        setProducts(INITIAL_PRODUCTS);
        localStorage.setItem('products', JSON.stringify(INITIAL_PRODUCTS));
      }

      setIsLoading(false);
    };

    fetchInitialData();
  }, []);

  const login = useCallback((email: string, storeName: string) => {
    const session = { email, storeName };
    setUserSession(session);
    setIsAdmin(email === ADMIN_EMAIL);
    // In a real app, this might be an API call that returns a token, then store the token.
    localStorage.setItem('userSession', JSON.stringify(session));
  }, []);

  const logout = useCallback(() => {
    setUserSession(null);
    setIsAdmin(false);
    // In a real app, might need to invalidate token on server-side too.
    localStorage.removeItem('userSession');
  }, []);

  const addOrder = useCallback((newOrderData: Omit<OrderType, 'id' | 'orderDate' | 'status'>): OrderType => {
    const newOrder: OrderType = {
      ...newOrderData,
      id: `order_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      orderDate: new Date().toISOString(),
      status: OrderStatus.PENDING,
    };
    // In a real app, this would be an API POST request to /api/orders
    // On success, the API would return the created order, then update state.
    // For optimistic updates, update state first, then make API call.
    setOrders(prevOrders => {
      const updatedOrders = [...prevOrders, newOrder];
      localStorage.setItem('orders', JSON.stringify(updatedOrders)); // Simulates backend save
      return updatedOrders;
    });
    return newOrder;
  }, []);

  const updateOrderStatus = useCallback((orderId: string, status: OrderStatus) => {
    // In a real app, this would be an API PUT/PATCH request to /api/orders/:orderId
    setOrders(prevOrders => {
      const updatedOrders = prevOrders.map(o => o.id === orderId ? { ...o, status } : o);
      localStorage.setItem('orders', JSON.stringify(updatedOrders)); // Simulates backend save
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
    // In a real app, API POST to /api/products
    setProducts(prevProducts => {
      const updatedProducts = [...prevProducts, newProduct];
      localStorage.setItem('products', JSON.stringify(updatedProducts)); // Simulates backend save
      return updatedProducts;
    });
    return newProduct;
  }, []);

  const updateProduct = useCallback((productId: string, updatedProductData: Partial<Omit<Product, 'id'>>) => {
    // In a real app, API PUT/PATCH to /api/products/:productId
    setProducts(prevProducts => {
      const updatedProducts = prevProducts.map(p =>
        p.id === productId ? { ...p, ...updatedProductData } : p
      );
      localStorage.setItem('products', JSON.stringify(updatedProducts)); // Simulates backend save
      return updatedProducts;
    });
  }, []);

  const deleteProduct = useCallback((productId: string) => {
    // In a real app, API DELETE to /api/products/:productId
    setProducts(prevProducts => {
      const updatedProducts = prevProducts.filter(p => p.id !== productId);
      localStorage.setItem('products', JSON.stringify(updatedProducts)); // Simulates backend save
      return updatedProducts;
    });
  }, []);

  const bulkAddProducts = useCallback((productsToAdd: Partial<Product>[]) => {
    // In a real app, this could be one or multiple API calls.
    // E.g., POST to /api/products/bulk
    setProducts(prevProducts => {
      const productMap = new Map(prevProducts.map(p => [p.id, p as Product]));
      
      productsToAdd.forEach(pToAdd => {
        const defaultNewProduct: Product = {
            id: `prod_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
            name: 'Unnamed Product', 
            imageUrl: 'https://picsum.photos/seed/defaultproduct/200/200', 
            price: 0,
            quantityType: 'unit',
            stock: 0,
            description: '',
            barcode: '',
        };

        if (pToAdd.id && productMap.has(pToAdd.id)) { // Update existing
          productMap.set(pToAdd.id, { ...(productMap.get(pToAdd.id)!), ...pToAdd } as Product);
        } else { // Add new
          const newId = pToAdd.id || defaultNewProduct.id;
          const fullNewProduct: Product = {
            ...defaultNewProduct, 
            ...pToAdd,            
            id: newId,            
          };
          if (!fullNewProduct.name?.trim()) fullNewProduct.name = defaultNewProduct.name;
          if (!fullNewProduct.imageUrl?.trim()) fullNewProduct.imageUrl = defaultNewProduct.imageUrl;
          
          productMap.set(newId, fullNewProduct);
        }
      });
      
      const updatedProductsArray = Array.from(productMap.values());
      localStorage.setItem('products', JSON.stringify(updatedProductsArray)); // Simulates backend save
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
      {isLoading ? (
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
