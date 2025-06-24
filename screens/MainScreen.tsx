
import React, { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../contexts/AppContext';
import { Product, OrderItemType, OrderType } from '../types';
import { useTranslation } from '../hooks/useTranslation';
import ProductCard from '../components/ProductCard';
import ProductListItem from '../components/ProductListItem'; // New component for list view
import OrderItemRow from '../components/OrderItemRow';
import Button from '../components/Button';
import InputField from '../components/InputField'; 

type ViewMode = 'grid' | 'list';

const MainScreen: React.FC = () => {
  const { userSession, addOrder, products, isAdmin } = useAppContext(); // Added isAdmin
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [currentOrderItems, setCurrentOrderItems] = useState<OrderItemType[]>([]);
  const [showOrderSubmittedModal, setShowOrderSubmittedModal] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');

  const visibleProducts = useMemo(() => {
    return products.filter(product => product.isVisible !== false); // Undefined or true means visible
  }, [products]);

  const filteredProducts = useMemo(() => {
    if (!searchTerm) return visibleProducts;
    return visibleProducts.filter(product =>
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.description?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [searchTerm, visibleProducts]);

  const handleAddToCart = useCallback((product: Product, quantity: number) => {
    if (isAdmin) return; // Admins cannot add to cart
    setCurrentOrderItems(prevItems => {
      const existingItem = prevItems.find(item => item.product.id === product.id);
      if (existingItem) {
        return prevItems.map(item =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
      }
      return [...prevItems, { product, quantity }];
    });
  }, [isAdmin]);

  const handleQuantityChange = useCallback((productId: string, newQuantity: number) => {
    if (isAdmin) return; // Admins cannot change quantity
    setCurrentOrderItems(prevItems =>
      prevItems.map(item =>
        item.product.id === productId ? { ...item, quantity: newQuantity } : item
      ).filter(item => item.quantity > 0) 
    );
  }, [isAdmin]);

  const handleRemoveItem = useCallback((productId: string) => {
    if (isAdmin) return; // Admins cannot remove items
    setCurrentOrderItems(prevItems => prevItems.filter(item => item.product.id !== productId));
  }, [isAdmin]);

  const calculateTotal = useMemo(() => {
    return currentOrderItems.reduce((total, item) => {
      return total + (item.product.price || 0) * item.quantity;
    }, 0);
  }, [currentOrderItems]);

  const handleSubmitOrder = async () => {
    if (isAdmin) return; // Admins cannot submit orders
    if (!userSession || currentOrderItems.length === 0) {
      alert(t('main.emptyOrder')); 
      return;
    }
    const submittedOrder: OrderType | null = await addOrder({
      storeName: userSession.storeName,
      userEmail: userSession.email,
      items: currentOrderItems,
      totalAmount: calculateTotal,
    });
    
    if (submittedOrder && submittedOrder.id) {
      setCurrentOrderItems([]); 
      setShowOrderSubmittedModal(true);
      setTimeout(() => {
          setShowOrderSubmittedModal(false);
          navigate(`/confirmation/${submittedOrder.id}`);
      }, 2000);
    } else {
      console.error("Order submission failed or submittedOrder is null/undefined.");
      alert(t('main.orderSubmissionFailed', {defaultValue: 'Order submission failed. Please try again.'})); 
    }
  };
  
  if (!userSession) {
     navigate('/login');
     return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <header className="mb-6">
          <h1 className="text-4xl font-bold text-gray-800">{t('main.productCatalog')}</h1>
          {userSession && !isAdmin && <p className="text-lg text-gray-600">{t('main.browseMessage', { storeName: userSession.storeName })}</p>}
          {userSession && isAdmin && <p className="text-lg text-indigo-600">{t('main.adminOrderingDisabled')}</p>}
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <div className="mb-4 flex flex-col sm:flex-row justify-between items-center gap-4">
              <div className="w-full sm:flex-grow">
                <InputField
                    label={t('main.searchLabel')}
                    id="search"
                    type="text"
                    placeholder={t('main.searchPlaceholder')}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="!mb-0"
                  />
              </div>
              <div className="flex space-x-2 rtl:space-x-reverse">
                <Button 
                  onClick={() => setViewMode('grid')} 
                  variant={viewMode === 'grid' ? 'primary' : 'secondary'}
                  size="sm"
                  aria-pressed={viewMode === 'grid'}
                >
                  {t('main.viewGrid')}
                </Button>
                <Button 
                  onClick={() => setViewMode('list')} 
                  variant={viewMode === 'list' ? 'primary' : 'secondary'}
                  size="sm"
                  aria-pressed={viewMode === 'list'}
                >
                  {t('main.viewList')}
                </Button>
              </div>
            </div>

            {filteredProducts.length > 0 ? (
              viewMode === 'grid' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                  {filteredProducts.map(product => (
                    <ProductCard key={product.id} product={product} onAddToCart={handleAddToCart} isAdmin={isAdmin} />
                  ))}
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredProducts.map(product => (
                    <ProductListItem key={product.id} product={product} onAddToCart={handleAddToCart} isAdmin={isAdmin} />
                  ))}
                </div>
              )
            ) : (
               visibleProducts.length === 0 ? ( 
                <p className="text-center text-gray-500 py-10 text-lg">{t('main.noProductsAvailable')}</p>
              ) : (
                <p className="text-center text-gray-500 py-10 text-lg">{t('main.noProductsFound')}</p>
              )
            )}
          </div>

          {!isAdmin && (
            <div className="lg:col-span-1">
              <div className="bg-white p-6 rounded-lg shadow-xl sticky top-24">
                <h2 className="text-2xl font-semibold text-gray-800 mb-4 border-b pb-2">{t('main.yourOrder')}</h2>
                {currentOrderItems.length === 0 ? (
                  <p className="text-gray-500">{t('main.emptyOrder')}</p>
                ) : (
                  <>
                    <div className="max-h-96 overflow-y-auto space-y-1 mb-4 pr-2 rtl:pr-0 rtl:pl-2">
                      {currentOrderItems.map(item => (
                        <OrderItemRow
                          key={item.product.id}
                          item={item}
                          onQuantityChange={handleQuantityChange}
                          onRemoveItem={handleRemoveItem}
                        />
                      ))}
                    </div>
                    <div className="border-t pt-4">
                      <div className="flex justify-between items-center mb-4">
                        <span className="text-lg font-semibold text-gray-700">{t('main.total')}</span>
                        <span className="text-2xl font-bold text-indigo-600">
                          {t('currency.format', { amount: calculateTotal.toFixed(2) })}
                        </span>
                      </div>
                      <Button
                        onClick={handleSubmitOrder}
                        variant="success"
                        size="lg"
                        className="w-full"
                        disabled={currentOrderItems.length === 0}
                      >
                        {t('main.submitOrder')}
                      </Button>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
      {showOrderSubmittedModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[100]">
          <div className="bg-white p-8 rounded-lg shadow-xl text-center">
            <svg className="w-16 h-16 text-green-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
            <h3 className="text-2xl font-semibold text-gray-800 mb-2">{t('main.orderSubmittedModalTitle')}</h3>
            <p className="text-gray-600">{t('main.orderSubmittedModalText')}</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default MainScreen;
