
import React, { useState, useMemo, useCallback } from 'react';
import { useAppContext } from '../contexts/AppContext';
import { OrderType, OrderStatus, OrderItemType, Product } from '../types';
import Button from '../components/Button';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from '../hooks/useTranslation';
import { exportToCsv, exportToXlsx, exportToPdf } from '../utils/exportUtils';

const OrderStatusBadge: React.FC<{ status: OrderStatus }> = ({ status }) => {
  const { t } = useTranslation();
  let bgColor = 'bg-gray-200';
  let textColor = 'text-gray-700';

  switch (status) {
    case OrderStatus.PENDING:
      bgColor = 'bg-yellow-100'; textColor = 'text-yellow-700'; break;
    case OrderStatus.PREPARING:
      bgColor = 'bg-blue-100'; textColor = 'text-blue-700'; break;
    case OrderStatus.SHIPPED:
      bgColor = 'bg-indigo-100'; textColor = 'text-indigo-700'; break;
    case OrderStatus.DELIVERED:
      bgColor = 'bg-green-100'; textColor = 'text-green-700'; break;
    case OrderStatus.CANCELLED:
      bgColor = 'bg-red-100'; textColor = 'text-red-700'; break;
  }
  return <span className={`px-2 py-1 text-xs font-semibold rounded-full ${bgColor} ${textColor}`}>{t(`orderStatus.${status}`)}</span>;
};

const OrderHistoryScreen: React.FC = () => {
  const { orders, userSession, getProductById, products: allProducts } = useAppContext();
  const { t, language } = useTranslation();
  const navigate = useNavigate();
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  const userOrders = useMemo(() => {
    if (!userSession) return [];
    return orders
      .filter(order => order.userEmail === userSession.email)
      .map(order => ({
        ...order,
        items: order.items.map(item => {
          const productDetails = getProductById(item.product.id) || allProducts.find(p => p.id === item.product.id);
          return {
            ...item,
            product: productDetails || item.product,
          };
        })
      }))
      .sort((a, b) => new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime());
  }, [orders, userSession, getProductById, allProducts]);

  const toggleExpandOrder = (orderId: string) => {
    setExpandedOrderId(prevId => (prevId === orderId ? null : orderId));
  };

  if (!userSession) {
    navigate('/login');
    return null;
  }
  
  const calculateOrderTotal = useCallback((order: OrderType) => {
    if (order.totalAmount !== undefined) return order.totalAmount;
    return order.items.reduce((sum, item) => {
        const product = item.product; 
        return sum + (product?.price || 0) * item.quantity;
    }, 0);
  }, []);


  const handleExport = async (format: 'csv' | 'xlsx' | 'pdf') => {
    setIsExporting(true);
    const dataToExport = userOrders.map(order => ({
      orderId: order.id,
      orderDate: new Date(order.orderDate).toLocaleString(language || undefined),
      status: t(`orderStatus.${order.status}`),
      totalItems: order.items.reduce((sum, item) => sum + item.quantity, 0),
      totalAmount: calculateOrderTotal(order).toFixed(2),
      items: order.items.map(item => `${item.product.name} (x${item.quantity})`).join(', ')
    }));

    const filename = `my_orders_export_${new Date().toISOString().split('T')[0]}`;

    try {
        if (format === 'csv') {
            exportToCsv(dataToExport, filename);
        } else if (format === 'xlsx') {
            exportToXlsx(dataToExport, filename, 'MyOrders');
        } else if (format === 'pdf') {
            const headers = [[t('dashboard.table.orderId'), t('dashboard.table.date'), t('dashboard.table.status'), t('dashboard.table.totalAmount')]];
            const body = dataToExport.map(order => [
            order.orderId.substring(0, 15) + '...',
            order.orderDate,
            order.status,
            t('currency.format', { amount: order.totalAmount })
            ]);
            exportToPdf(t('orderHistory.exportMyOrders'), headers, body, filename, language === 'ar');
        }
    } catch (error) {
        console.error("Export failed:", error);
        alert("Export failed. Please try again.");
    } finally {
        setIsExporting(false);
    }
  };


  return (
    <div className="min-h-screen bg-gray-100 p-4 sm:p-6 lg:p-8">
      <div className="max-w-4xl mx-auto">
        <header className="mb-8 flex flex-col sm:flex-row justify-between items-center">
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-800">{t('orderHistory.title')}</h1>
          {userOrders.length > 0 && (
            <div className="relative mt-4 sm:mt-0">
                 <Button
                    variant="primary"
                    onClick={() => { /* Placeholder for dropdown */ }}
                    isLoading={isExporting}
                    disabled={isExporting}
                    className="peer"
                >
                    {isExporting ? t('general.loading') : t('orderHistory.exportMyOrders')}
                     <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 ml-2 rtl:mr-2 rtl:ml-0">
                        <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                    </svg>
                </Button>
                <div className="absolute right-0 rtl:left-0 rtl:right-auto mt-1 w-48 bg-white rounded-md shadow-lg z-10 hidden peer-focus:block hover:block focus-within:block">
                    <a onClick={() => handleExport('csv')} className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer">{t('export.csv')}</a>
                    <a onClick={() => handleExport('xlsx')} className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer">{t('export.xlsx')}</a>
                    <a onClick={() => handleExport('pdf')} className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer">{t('export.pdf')}</a>
                </div>
            </div>
          )}
        </header>

        {userOrders.length === 0 ? (
          <div className="text-center py-10 bg-white rounded-lg shadow-md">
            <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 7.5V6.108c0-1.135.845-2.098 1.976-2.192.373-.03.748-.03 1.125 0 1.131.094 1.976 1.057 1.976 2.192V7.5M8.25 7.5h7.5M8.25 7.5c0 1.135-.845 2.098-1.976 2.192a48.424 48.424 0 0 1-1.125 0c-1.131-.094-1.976-1.057-1.976-2.192V6.108c0-1.135.845-2.098 1.976-2.192.373-.03.748-.03 1.125 0 1.131.094 1.976 1.057 1.976 2.192V7.5M6 18.75h12c.621 0 1.125-.504 1.125-1.125V11.25c0-.621-.504-1.125-1.125-1.125H6c-.621 0-1.125.504-1.125 1.125v6.375c0 .621.504 1.125 1.125 1.125Z" />
            </svg>
            <p className="text-xl text-gray-500">{t('orderHistory.noOrders')}</p>
          </div>
        ) : (
          <div className="space-y-6">
            {userOrders.map((order) => (
              <div key={order.id} className="bg-white shadow-lg rounded-lg overflow-hidden">
                <div className="p-4 sm:p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center">
                  <div>
                    <h2 className="text-lg font-semibold text-indigo-700" title={order.id}>
                      {t('dashboard.table.orderId')}: {order.id.substring(0, 15)}...
                    </h2>
                    <p className="text-sm text-gray-500">
                      {new Date(order.orderDate).toLocaleString(language || undefined)}
                    </p>
                  </div>
                  <div className="mt-3 sm:mt-0 flex flex-col sm:items-end space-y-2 sm:space-y-0">
                     <OrderStatusBadge status={order.status} />
                     <p className="text-lg font-semibold text-gray-700 mt-1 sm:mt-0">
                       {t('currency.format', { amount: calculateOrderTotal(order).toFixed(2) })}
                     </p>
                  </div>
                   <Button onClick={() => toggleExpandOrder(order.id)} variant="secondary" size="sm" className="mt-3 sm:mt-0 sm:ml-4 rtl:sm:mr-4 rtl:sm:ml-0">
                      {expandedOrderId === order.id ? t('dashboard.hide') : t('dashboard.view')}
                   </Button>
                </div>
                {expandedOrderId === order.id && (
                  <div className="p-4 sm:p-6 border-t border-gray-200 bg-gray-50 text-left rtl:text-right">
                    <h4 className="text-md font-semibold mb-3 text-gray-700">{t('dashboard.orderDetailsFor', {orderId: order.id.substring(0,15) + '...'})}</h4>
                    <div className="space-y-3">
                      {order.items.map((item: OrderItemType) => {
                        const productDetails = item.product; 
                        const itemSubtotal = productDetails?.price ? (productDetails.price * item.quantity).toFixed(2) : '0.00';
                        
                        return (
                          <div key={item.product.id} className="p-3 bg-white rounded shadow-sm border border-gray-200">
                             <p className="font-medium text-gray-800">
                                {productDetails?.name || item.product.id}
                             </p>
                             <p className="text-sm text-gray-600">
                                {t('dashboard.itemQuantity', {quantity: item.quantity})}
                             </p>
                             <p className="text-sm text-gray-600">
                               {t('dashboard.itemSubtotalLabel')}{' '}
                               <span className="font-semibold">{t('currency.format', {amount: itemSubtotal})}</span>
                             </p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default OrderHistoryScreen;
