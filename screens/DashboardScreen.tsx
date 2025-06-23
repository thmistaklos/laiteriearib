
import React, { useState, useMemo, useCallback } from 'react';
import { useAppContext } from '../contexts/AppContext';
import { OrderType, OrderStatus, OrderItemType, Product } from '../types';
import { ALL_ORDER_STATUSES } from '../constants';
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


const DashboardScreen: React.FC = () => {
  const { orders, updateOrderStatus, userSession, getProductById, products: allProducts } = useAppContext();
  const { t, language } = useTranslation();
  const navigate = useNavigate();
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  const enrichedOrders = useMemo(() => {
    return orders.map(order => ({
      ...order,
      items: order.items.map(item => {
        const productDetails = getProductById(item.product.id) || allProducts.find(p => p.id === item.product.id);
        return {
          ...item,
          product: productDetails || item.product, 
        };
      })
    })).sort((a, b) => new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime());
  }, [orders, getProductById, allProducts]);


  const handleStatusChange = (orderId: string, newStatus: OrderStatus) => {
    updateOrderStatus(orderId, newStatus);
  };

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
        const product = item.product; // Already enriched
        return sum + (product?.price || 0) * item.quantity;
    }, 0);
  }, []);

  const handleExport = async (format: 'csv' | 'xlsx' | 'pdf') => {
    setIsExporting(true);
    const dataToExport = enrichedOrders.map(order => ({
      orderId: order.id,
      storeName: order.storeName,
      userEmail: order.userEmail,
      orderDate: new Date(order.orderDate).toLocaleString(language || undefined),
      status: t(`orderStatus.${order.status}`),
      totalItems: order.items.reduce((sum, item) => sum + item.quantity, 0),
      totalAmount: calculateOrderTotal(order).toFixed(2),
      items: order.items.map(item => `${item.product.name} (x${item.quantity})`).join(', ')
    }));

    const filename = `orders_export_${new Date().toISOString().split('T')[0]}`;

    try {
      if (format === 'csv') {
        exportToCsv(dataToExport, filename);
      } else if (format === 'xlsx') {
        exportToXlsx(dataToExport, filename, 'Orders');
      } else if (format === 'pdf') {
        const headers = [
          [t('dashboard.table.orderId'), t('dashboard.table.storeName'), t('dashboard.table.date'), t('dashboard.table.status'), t('dashboard.table.totalAmount')]
        ];
        const body = dataToExport.map(order => [
          order.orderId.substring(0, 15) + '...',
          order.storeName,
          order.orderDate,
          order.status,
          t('currency.format', {amount: order.totalAmount})
        ]);
        exportToPdf(t('dashboard.exportOrders'), headers, body, filename, language === 'ar');
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
      <div className="max-w-7xl mx-auto">
        <header className="mb-8 flex flex-col sm:flex-row justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold text-gray-800">{t('dashboard.title')}</h1>
            <p className="text-lg text-gray-600">{t('dashboard.subtitle')}</p>
          </div>
          <div className="relative mt-4 sm:mt-0">
            <Button
              variant="primary"
              onClick={() => { /* Placeholder for dropdown logic or use a select */ }}
              isLoading={isExporting}
              disabled={isExporting || enrichedOrders.length === 0}
              className="peer"
            >
              {isExporting ? t('general.loading') : t('dashboard.exportOrders')}
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 ml-2 rtl:mr-2 rtl:ml-0">
                <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
              </svg>
            </Button>
            {enrichedOrders.length > 0 && (
            <div className="absolute right-0 rtl:left-0 rtl:right-auto mt-1 w-48 bg-white rounded-md shadow-lg z-10 hidden peer-focus:block hover:block focus-within:block">
              <a onClick={() => handleExport('csv')} className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer">{t('export.csv')}</a>
              <a onClick={() => handleExport('xlsx')} className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer">{t('export.xlsx')}</a>
              <a onClick={() => handleExport('pdf')} className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer">{t('export.pdf')}</a>
            </div>
            )}
          </div>
        </header>

        {enrichedOrders.length === 0 ? (
          <div className="text-center py-10 bg-white rounded-lg shadow-md">
            <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"></path></svg>
            <p className="text-xl text-gray-500">{t('dashboard.noOrders')}</p>
          </div>
        ) : (
          <div className="bg-white shadow-xl rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left rtl:text-right text-xs font-medium text-gray-500 uppercase tracking-wider">{t('dashboard.table.orderId')}</th>
                    <th scope="col" className="px-6 py-3 text-left rtl:text-right text-xs font-medium text-gray-500 uppercase tracking-wider">{t('dashboard.table.storeName')}</th>
                    <th scope="col" className="px-6 py-3 text-left rtl:text-right text-xs font-medium text-gray-500 uppercase tracking-wider">{t('dashboard.table.date')}</th>
                    <th scope="col" className="px-6 py-3 text-left rtl:text-right text-xs font-medium text-gray-500 uppercase tracking-wider">{t('dashboard.table.totalItems')}</th>
                    <th scope="col" className="px-6 py-3 text-left rtl:text-right text-xs font-medium text-gray-500 uppercase tracking-wider">{t('dashboard.table.totalAmount')}</th>
                    <th scope="col" className="px-6 py-3 text-left rtl:text-right text-xs font-medium text-gray-500 uppercase tracking-wider">{t('dashboard.table.status')}</th>
                    <th scope="col" className="px-6 py-3 text-left rtl:text-right text-xs font-medium text-gray-500 uppercase tracking-wider">{t('dashboard.table.updateStatus')}</th>
                    <th scope="col" className="px-6 py-3 text-left rtl:text-right text-xs font-medium text-gray-500 uppercase tracking-wider">{t('dashboard.table.details')}</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {enrichedOrders.map((order: OrderType) => (
                    <React.Fragment key={order.id}>
                    <tr>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 truncate max-w-xs" title={order.id}>{order.id.substring(0,15)}...</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{order.storeName}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(order.orderDate).toLocaleString(language || undefined)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">{order.items.reduce((sum, item) => sum + item.quantity, 0)}</td>
                       <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                         {t('currency.format', { amount: calculateOrderTotal(order).toFixed(2) })}
                       </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <OrderStatusBadge status={order.status} />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <select
                          value={order.status}
                          onChange={(e) => handleStatusChange(order.id, e.target.value as OrderStatus)}
                          className="block w-full pl-3 pr-10 rtl:pl-10 rtl:pr-3 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                          aria-label={t('dashboard.table.updateStatus')}
                        >
                          {ALL_ORDER_STATUSES.map(statusVal => (
                            <option key={statusVal} value={statusVal}>{t(`orderStatus.${statusVal}`)}</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <Button onClick={() => toggleExpandOrder(order.id)} variant="secondary" size="sm">
                          {expandedOrderId === order.id ? t('dashboard.hide') : t('dashboard.view')}
                        </Button>
                      </td>
                    </tr>
                    {expandedOrderId === order.id && (
                      <tr>
                        <td colSpan={8} className="p-4 bg-gray-50 text-left rtl:text-right">
                          <div className="bg-slate-100 p-4 rounded-md shadow">
                            <h4 className="text-md font-semibold mb-3 text-indigo-700">{t('dashboard.orderDetailsFor', {orderId: order.id.substring(0,15) + '...'})}</h4>
                            <div className="space-y-3">
                              {order.items.map((item: OrderItemType) => {
                                 const productDetails = item.product; // Already enriched
                                 const priceInfo = productDetails?.price ? t('dashboard.priceAt', {price: productDetails.price.toFixed(2)}) : '';
                                 const itemSubtotal = productDetails?.price ? (productDetails.price * item.quantity).toFixed(2) : '0.00';
                                 const quantityTypeDisplay = productDetails.quantityType === 'kg' ? t('productAdmin.quantityKg') : t('productAdmin.quantityUnit');

                                 return (
                                  <div key={item.product.id} className="p-3 bg-white rounded shadow-sm border border-gray-200">
                                    <p className="font-medium text-gray-800">{productDetails?.name || item.product.id}</p>
                                    <p className="text-sm text-gray-600">
                                      {t('dashboard.productDetails', {
                                        productName: "", // Name is already displayed
                                        quantity: item.quantity, 
                                        quantityType: quantityTypeDisplay,
                                        priceInfo: priceInfo
                                      })}
                                    </p>
                                    <p className="text-sm text-gray-600 font-semibold">
                                      {t('dashboard.itemSubtotal', {subtotal: itemSubtotal})}
                                    </p>
                                  </div>
                                 );
                              })}
                            </div>
                             <div className="mt-4 pt-3 border-t border-gray-300">
                                <p className="text-right rtl:text-left font-bold text-gray-700">
                                  {t('main.total')}{' '}
                                  {t('currency.format', { amount: calculateOrderTotal(order).toFixed(2) })}
                                </p>
                              </div>
                          </div>
                        </td>
                      </tr>
                    )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DashboardScreen;
