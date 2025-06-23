
import React, { useEffect, useState }from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAppContext } from '../contexts/AppContext';
import { OrderType, OrderItemType } from '../types';
import Button from '../components/Button';
import { useTranslation } from '../hooks/useTranslation';

const ConfirmationScreen: React.FC = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const { orders, userSession, getProductById } = useAppContext();
  const { t } = useTranslation();
  const [confirmedOrder, setConfirmedOrder] = useState<OrderType | null>(null);

 useEffect(() => {
    if (!orderId) {
      navigate('/main'); 
      return;
    }
    const foundOrder = orders.find(o => o.id === orderId);
    if (foundOrder) {
      const enrichedItems = foundOrder.items.map(item => {
        const productDetails = getProductById(item.product.id);
        return {
          ...item,
          product: productDetails || item.product, 
        };
      });
      setConfirmedOrder({...foundOrder, items: enrichedItems});
    } else {
      console.warn("Order not found in confirmation screen:", orderId);
    }
  }, [orderId, orders, navigate, getProductById]);


  if (!userSession) {
     navigate('/login');
     return null;
  }

  if (!confirmedOrder) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
        <div className="bg-white p-8 rounded-lg shadow-xl text-center max-w-lg w-full">
            <h2 className="text-2xl font-semibold text-gray-700 mb-4">{t('confirmation.loading')}</h2>
            <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-indigo-500 mx-auto"></div>
            <p className="mt-4 text-gray-500">{t('confirmation.loadingError')}</p>
             <Link to="/main">
                <Button variant="primary" className="mt-6">
                {t('confirmation.backToOrdering')}
                </Button>
            </Link>
        </div>
      </div>
    );
  }
  
  const orderTotal = confirmedOrder.items.reduce((sum, item) => sum + (item.product.price || 0) * item.quantity, 0);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-500 to-teal-500 p-4">
      <div className="bg-white p-8 sm:p-10 rounded-xl shadow-2xl w-full max-w-2xl">
        <div className="text-center mb-8">
          <svg className="w-20 h-20 text-green-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
          <h2 className="text-3xl font-bold text-gray-800">{t('confirmation.title')}</h2>
          <p className="text-gray-600 mt-2">{t('confirmation.thankYou', {storeName: confirmedOrder.storeName, orderId: confirmedOrder.id})}</p>
        </div>

        <div className="border-t border-b border-gray-200 py-6 my-6">
          <h3 className="text-xl font-semibold text-gray-700 mb-4 text-left rtl:text-right">{t('confirmation.summaryTitle')}</h3>
          <div className="space-y-3 max-h-60 overflow-y-auto pr-2 rtl:pr-0 rtl:pl-2">
            {confirmedOrder.items.map((item: OrderItemType) => (
              <div key={item.product.id} className="flex justify-between items-center p-2 bg-gray-50 rounded-md">
                <div className="text-left rtl:text-right">
                  <span className="font-medium text-gray-700">{item.product.name}</span>
                  <span className="text-sm text-gray-500"> (x{item.quantity})</span>
                </div>
                {item.product.price && 
                  <span className="text-gray-600">
                    {t('currency.format', { amount: (item.product.price * item.quantity).toFixed(2) })}
                  </span>
                }
              </div>
            ))}
          </div>
           {orderTotal > 0 && (
            <div className="mt-4 pt-4 border-t flex justify-between items-center">
              <span className="text-lg font-semibold text-gray-800">{t('confirmation.total')}</span>
              <span className="text-xl font-bold text-indigo-700">
                {t('currency.format', { amount: orderTotal.toFixed(2) })}
              </span>
            </div>
          )}
        </div>
        
        <div className="text-center">
          <Button onClick={() => navigate('/main')} variant="primary" size="lg">
            {t('confirmation.backToHome')}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationScreen;
