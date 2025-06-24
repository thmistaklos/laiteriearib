
import React, { useState, FormEvent, ChangeEvent, useRef } from 'react';
import { useAppContext } from '../contexts/AppContext';
import { Product } from '../types';
import { useTranslation } from '../hooks/useTranslation';
import Button from '../components/Button';
import InputField from '../components/InputField';
import { exportToCsv, exportToXlsx, exportToPdf } from '../utils/exportUtils';
import Papa from 'papaparse';

const EyeIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
  </svg>
);

const EyeSlashIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88" />
  </svg>
);


const ProductAdminScreen: React.FC = () => {
  const { products, addProduct, updateProduct, deleteProduct, isAdmin, bulkAddProducts } = useAppContext();
  const { t, language } = useTranslation();
  const [showModal, setShowModal] = useState(false);
  const [currentProduct, setCurrentProduct] = useState<Partial<Product> & { id?: string }>({});
  const [isEditMode, setIsEditMode] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [importSuccess, setImportSuccess] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [hasPendingConfirmation, setHasPendingConfirmation] = useState(false);
  const [confirmationAlert, setConfirmationAlert] = useState<string | null>(null);


  if (!isAdmin) {
      return <div className="p-8 text-center text-red-500">Access Denied. You must be an admin to view this page.</div>;
  }

  const initialProductState: Omit<Product, 'id'> = {
    name: '',
    description: '',
    price: 0,
    imageUrl: '', 
    barcode: '',
    quantityType: 'unit',
    stock: 0,
    isVisible: true,
  };

  const openModalForAdd = () => {
    setCurrentProduct(initialProductState);
    setIsEditMode(false);
    setErrors({});
    setImagePreview(null);
    setShowModal(true);
  };

  const openModalForEdit = (product: Product) => {
    setCurrentProduct({ 
      ...initialProductState, 
      ...product,
      quantityType: product.quantityType || 'unit',
      stock: product.stock === undefined ? 0 : product.stock,
      isVisible: product.isVisible === undefined ? true : product.isVisible,
    });
    setIsEditMode(true);
    setErrors({});
    setImagePreview(product.imageUrl); 
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setCurrentProduct({});
    setErrors({});
    setImagePreview(null);
  };

  const validateForm = (): boolean => {
    const newErrors: { [key: string]: string } = {};
    if (!currentProduct.name?.trim()) newErrors.name = t('productAdmin.modal.nameRequired');
    if (!currentProduct.imageUrl) newErrors.imageUrl = t('productAdmin.modal.imageUrlRequired'); 
    
    if (currentProduct.price === undefined || currentProduct.price < 0) newErrors.price = t('productAdmin.modal.priceNonNegative');
    if (currentProduct.stock === undefined || currentProduct.stock < 0) newErrors.stock = t('productAdmin.modal.stockNonNegative');
    if (!currentProduct.quantityType) newErrors.quantityType = t('productAdmin.modal.quantityTypeRequired');
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    const productData: Omit<Product, 'id'> = {
        name: currentProduct.name!,
        description: currentProduct.description || '',
        price: Number(currentProduct.price) || 0,
        imageUrl: currentProduct.imageUrl!, 
        barcode: currentProduct.barcode || '',
        quantityType: currentProduct.quantityType || 'unit',
        stock: Number(currentProduct.stock) || 0,
        isVisible: currentProduct.isVisible === undefined ? true : currentProduct.isVisible,
    };
    
    let success = false;
    setConfirmationAlert(null); 

    if (isEditMode && currentProduct.id) {
      try {
        await updateProduct(currentProduct.id, productData);
        success = true;
        setConfirmationAlert(t('productAdmin.productUpdatedSuccess'));
      } catch (error) {
        console.error("Error updating product:", error);
        setConfirmationAlert(t('productAdmin.productSaveFailed'));
      }
    } else {
      try {
        const newProd = await addProduct(productData as Product);
        if (newProd) {
          success = true;
          setConfirmationAlert(t('productAdmin.productAddedSuccess'));
        } else {
          setConfirmationAlert(t('productAdmin.productSaveFailed'));
        }
      } catch (error) {
         console.error("Error adding product:", error);
         setConfirmationAlert(t('productAdmin.productSaveFailed'));
      }
    }

    if (success) {
      setHasPendingConfirmation(true);
    }
    
    setTimeout(() => {
        setConfirmationAlert(null);
    }, 3000);
    closeModal();
  };

  const handleDelete = async (productId: string) => {
    if (window.confirm(t('productAdmin.modal.confirmDelete'))) {
      setConfirmationAlert(null); 
      try {
        await deleteProduct(productId);
        setConfirmationAlert(t('productAdmin.productDeletedSuccess'));
      } catch (error) {
        console.error("Error deleting product:", error);
        setConfirmationAlert(t('productAdmin.productDeleteFailed'));
      }
       setTimeout(() => {
        setConfirmationAlert(null);
      }, 3000);
    }
  };

  const handleToggleVisibility = async (product: Product) => {
    setConfirmationAlert(null);
    try {
      await updateProduct(product.id, { isVisible: !(product.isVisible === undefined ? true : product.isVisible) });
      setConfirmationAlert(t('productAdmin.visibilityUpdatedSuccess', { name: product.name }));
      setHasPendingConfirmation(true);
    } catch (error) {
      console.error("Error toggling product visibility:", error);
      setConfirmationAlert(t('productAdmin.visibilityUpdateFailed', { name: product.name }));
    }
    setTimeout(() => {
        setConfirmationAlert(null);
    }, 3000);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    
    if (type === 'checkbox') {
        const { checked } = e.target as HTMLInputElement;
        setCurrentProduct(prev => ({ ...prev, [name]: checked }));
    } else {
        setCurrentProduct(prev => ({ 
            ...prev, 
            [name]: (name === 'price' || name === 'stock') ? parseFloat(value) : value 
        }));
    }
    
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleImageChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        setCurrentProduct(prev => ({ ...prev, imageUrl: result }));
        setImagePreview(result);
        if (errors.imageUrl) {
          setErrors(prev => ({ ...prev, imageUrl: '' }));
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleExport = async (format: 'csv' | 'xlsx' | 'pdf') => {
    setIsExporting(true);
    setImportError(null);
    setImportSuccess(null);
    setConfirmationAlert(null);

    const dataToExport = products.map(p => ({
      id: p.id,
      name: p.name,
      description: p.description || '',
      price: p.price !== undefined ? p.price : '',
      imageUrl: p.imageUrl,
      barcode: p.barcode || '',
      quantityType: p.quantityType || 'unit',
      stock: p.stock !== undefined ? p.stock : '',
      isVisible: p.isVisible === undefined ? true : p.isVisible, // Default to true if undefined
    }));

    const filename = `products_export_${new Date().toISOString().split('T')[0]}`;

    try {
      if (format === 'csv') {
        exportToCsv(dataToExport, filename);
      } else if (format === 'xlsx') {
        exportToXlsx(dataToExport, filename, 'Products');
      } else if (format === 'pdf') {
        const headers = [[t('productAdmin.table.name'), t('productAdmin.table.price'), t('productAdmin.table.stock'), t('productAdmin.table.type'), t('productAdmin.table.visibility')]];
        const body = dataToExport.map(p => [
          p.name,
          p.price !== '' ? t('currency.format', { amount: Number(p.price).toFixed(2) }) : 'N/A',
          p.stock,
          p.quantityType === 'kg' ? t('productAdmin.quantityKg') : t('productAdmin.quantityUnit'),
          p.isVisible ? t('productAdmin.visible') : t('productAdmin.hidden')
        ]);
        exportToPdf(t('productAdmin.exportProducts'), headers, body, filename, language === 'ar');
      }
    } catch (error) {
        console.error("Export failed:", error);
        alert("Export failed. Please try again.");
    } finally {
        setIsExporting(false);
    }
  };

  const handleImportChange = (event: ChangeEvent<HTMLInputElement>) => {
    setImportError(null);
    setImportSuccess(null);
    setConfirmationAlert(null);
    const file = event.target.files?.[0];
    if (!file) {
      setImportError(t('productAdmin.import.fileRequired'));
      return;
    }

    setIsImporting(true);
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => { 
        try {
          const mappedProducts: Partial<Product>[] = results.data.map((row: any): Partial<Product> => {
            const id = row.id ? String(row.id).trim() : undefined;
            const name = row.name ? String(row.name).trim() : undefined;
            const description = row.description ? String(row.description).trim() : undefined;
            
            const priceString = row.price !== undefined && row.price !== null ? String(row.price).trim() : '';
            const parsedPrice = priceString !== '' ? parseFloat(priceString) : undefined;
            const price = (parsedPrice !== undefined && !isNaN(parsedPrice)) ? parsedPrice : undefined;
            
            const imageUrl = row.imageUrl ? String(row.imageUrl).trim() : undefined;
            const barcode = row.barcode ? String(row.barcode).trim() : undefined;
            
            const rawQuantityType = row.quantityType ? String(row.quantityType).trim().toLowerCase() : 'unit';
            const finalQuantityType: 'unit' | 'kg' = rawQuantityType === 'kg' ? 'kg' : 'unit';

            const stockString = row.stock !== undefined && row.stock !== null ? String(row.stock).trim() : '';
            const parsedStock = stockString !== '' ? parseInt(stockString, 10) : undefined;
            const stock = (parsedStock !== undefined && !isNaN(parsedStock)) ? parsedStock : undefined;

            let isVisibleValue: boolean | undefined = undefined;
            if (row.isVisible !== undefined && row.isVisible !== null) {
                const isVisibleString = String(row.isVisible).trim().toLowerCase();
                if (isVisibleString === 'true' || isVisibleString === '1') {
                    isVisibleValue = true;
                } else if (isVisibleString === 'false' || isVisibleString === '0') {
                    isVisibleValue = false;
                } else {
                    isVisibleValue = true; // Default for unrecognized string
                }
            } else {
              isVisibleValue = true; // Default if column missing or empty
            }


            return {
              id: id || undefined, 
              name: name || undefined,
              description: description || undefined,
              price,
              imageUrl: imageUrl || undefined,
              barcode: barcode || undefined,
              quantityType: finalQuantityType,
              stock,
              isVisible: isVisibleValue,
            };
          });

          const importedProducts = mappedProducts.filter(p => 
            Object.values(p).some(val => val !== undefined && (typeof val === 'string' ? val.trim() !== '' : true))
          );

          if (importedProducts.length > 0) {
            await bulkAddProducts(importedProducts); 
            setImportSuccess(t('productAdmin.import.success', { count: importedProducts.length }));
            setHasPendingConfirmation(true);
          } else {
            setImportError(t('productAdmin.import.errorNoValid', {error: results.errors.length > 0 ? results.errors[0].message : "No valid product data found in CSV or CSV is empty."}));
          }
        } catch (err: any) {
          console.error("Import processing error:", err);
          setImportError(t('productAdmin.import.error', { error: err.message || "CSV processing failed."}));
        } finally {
          setIsImporting(false);
           if (fileInputRef.current) { 
            fileInputRef.current.value = "";
          }
        }
      },
      error: (error: any) => {
        console.error("CSV parsing error:", error);
        setImportError(t('productAdmin.import.error', {error: error.message || "CSV parsing failed."}));
        setIsImporting(false);
         if (fileInputRef.current) {
            fileInputRef.current.value = "";
          }
      }
    });
  };

  const handleConfirmSaves = () => {
    setConfirmationAlert(t('productAdmin.allChangesConfirmed'));
    setHasPendingConfirmation(false);
    setTimeout(() => {
      setConfirmationAlert(null);
    }, 3000);
  };


  return (
    <div className="min-h-screen bg-gray-100 p-4 sm:p-6 lg:p-8">
      <div className="max-w-5xl mx-auto">
        <header className="mb-8 flex flex-col sm:flex-row justify-between items-center gap-4">
          <h1 className="text-3xl font-bold text-gray-800">{t('productAdmin.manageProductsTitle')}</h1>
          <div className="flex flex-wrap gap-2">
             <div className="relative group">
                <Button 
                    variant="secondary" 
                    isLoading={isExporting} 
                    disabled={isExporting || products.length === 0}
                    className="peer"
                >
                    {isExporting ? t('general.loading') : t('productAdmin.exportProducts')}
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 ml-2 rtl:mr-2 rtl:ml-0"><path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" /></svg>
                </Button>
                {products.length > 0 && (
                <div className="absolute right-0 rtl:left-0 rtl:right-auto mt-1 w-48 bg-white rounded-md shadow-lg z-20 hidden group-hover:block peer-focus:block focus-within:block">
                    <a onClick={() => handleExport('csv')} className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer">{t('export.csv')}</a>
                    <a onClick={() => handleExport('xlsx')} className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer">{t('export.xlsx')}</a>
                    <a onClick={() => handleExport('pdf')} className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer">{t('export.pdf')}</a>
                </div>
                )}
            </div>
            <Button onClick={() => fileInputRef.current?.click()} variant="secondary" isLoading={isImporting} disabled={isImporting}>
                {isImporting ? t('productAdmin.import.processing') : t('productAdmin.importProducts')}
            </Button>
            <input type="file" accept=".csv" onChange={handleImportChange} ref={fileInputRef} className="hidden" />
             <Button 
              onClick={handleConfirmSaves} 
              variant="success"
              disabled={!hasPendingConfirmation || products.length === 0}
            >
              {t('productAdmin.confirmChangesSaved')}
            </Button>
            <Button onClick={openModalForAdd} variant="primary">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 mr-2 rtl:ml-2 rtl:mr-0">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              {t('productAdmin.addNewProduct')}
            </Button>
          </div>
        </header>

        {confirmationAlert && <div className={`mb-4 p-3 rounded-md animate-pulse ${confirmationAlert.includes('Failed') || confirmationAlert.includes('Error') ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>{confirmationAlert}</div>}
        {importError && <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md">{importError}</div>}
        {importSuccess && <div className="mb-4 p-3 bg-green-100 text-green-700 rounded-md">{importSuccess}</div>}


        {products.length === 0 && !isImporting ? (
          <div className="text-center py-10 bg-white rounded-lg shadow-md">
            <p className="text-xl text-gray-500">{t('productAdmin.noProducts')}</p>
          </div>
        ) : (
          <div className="bg-white shadow-xl rounded-lg overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left rtl:text-right text-xs font-medium text-gray-500 uppercase tracking-wider">{t('productAdmin.table.image')}</th>
                  <th className="px-6 py-3 text-left rtl:text-right text-xs font-medium text-gray-500 uppercase tracking-wider">{t('productAdmin.table.name')}</th>
                  <th className="px-6 py-3 text-left rtl:text-right text-xs font-medium text-gray-500 uppercase tracking-wider">{t('productAdmin.table.price')}</th>
                  <th className="px-6 py-3 text-left rtl:text-right text-xs font-medium text-gray-500 uppercase tracking-wider">{t('productAdmin.table.stock')}</th>
                  <th className="px-6 py-3 text-left rtl:text-right text-xs font-medium text-gray-500 uppercase tracking-wider">{t('productAdmin.table.type')}</th>
                  <th className="px-6 py-3 text-left rtl:text-right text-xs font-medium text-gray-500 uppercase tracking-wider">{t('productAdmin.table.visibility')}</th>
                  <th className="px-6 py-3 text-left rtl:text-right text-xs font-medium text-gray-500 uppercase tracking-wider">{t('productAdmin.table.actions')}</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {products.map(product => {
                  const isVisible = product.isVisible === undefined ? true : product.isVisible;
                  return (
                  <tr key={product.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <img src={product.imageUrl} alt={product.name} className="w-12 h-12 object-cover rounded"/>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{product.name}</div>
                      <div className="text-xs text-gray-500 truncate max-w-xs" title={product.description}>{product.description}</div>
                      {product.barcode && <div className="text-xs text-gray-400">BC: {product.barcode}</div>}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {product.price !== undefined ? t('currency.format', { amount: product.price.toFixed(2) }) : ''}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{product.stock}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 capitalize">
                        {product.quantityType === 'kg' ? t('productAdmin.quantityKg') : t('productAdmin.quantityUnit')}
                    </td>
                     <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          isVisible ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {isVisible ? t('productAdmin.visible') : t('productAdmin.hidden')}
                        </span>
                      </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-1 rtl:space-x-reverse">
                      <Button onClick={() => openModalForEdit(product)} variant="secondary" size="sm" className="!px-2 !py-1">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" /></svg>
                      </Button>
                      <Button onClick={() => handleToggleVisibility(product)} variant="secondary" size="sm" className="!px-2 !py-1" aria-label={isVisible ? t('aria.setHidden') : t('aria.setVisible')}>
                        {isVisible ? <EyeSlashIcon className="w-4 h-4"/> : <EyeIcon className="w-4 h-4"/>}
                      </Button>
                      <Button onClick={() => handleDelete(product.id)} variant="danger" size="sm" className="!px-2 !py-1">
                         <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12.56 0c.34-.059.68-.111 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09.991-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" /></svg>
                      </Button>
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[100]">
          <div className="bg-white p-6 sm:p-8 rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-semibold text-gray-800 mb-6">{isEditMode ? t('productAdmin.modal.editTitle') : t('productAdmin.modal.addTitle')}</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <InputField
                label={t('productAdmin.modal.productName')}
                id="name" name="name" type="text"
                value={currentProduct.name || ''}
                onChange={handleInputChange}
                error={errors.name} required
              />
              <InputField
                label={t('productAdmin.modal.description')}
                id="description" name="description" type="text" 
                value={currentProduct.description || ''}
                onChange={handleInputChange}
              />
               <InputField
                label={t('productAdmin.modal.price')}
                id="price" name="price" type="number"
                value={currentProduct.price === undefined ? '' : String(currentProduct.price)}
                onChange={handleInputChange} error={errors.price}
                min="0" step="0.01" required
              />
              <div>
                <label htmlFor="imageUrl" className="block text-sm font-medium text-gray-700 mb-1">
                  {t('productAdmin.modal.imageUpload')}
                </label>
                <input
                  id="imageUrlFile" name="imageUrlFile" type="file" // Name changed to avoid conflict with currentProduct.imageUrl
                  accept="image/*"
                  onChange={handleImageChange}
                  className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                />
                {imagePreview && (
                  <div className="mt-2">
                    <p className="text-xs text-gray-500">{t('productAdmin.modal.currentImage')}:</p>
                    <img src={imagePreview} alt="Preview" className="h-24 w-auto object-contain rounded border border-gray-200 mt-1"/>
                  </div>
                )}
                <InputField
                    label={t('productAdmin.modal.imageUrlLabel')}
                    id="imageUrl" name="imageUrl" type="text"
                    value={currentProduct.imageUrl || ''}
                    onChange={handleInputChange}
                    error={errors.imageUrl} required
                    placeholder={t('productAdmin.modal.imageUrlPlaceholder')}
                />
              </div>
              <InputField
                label={t('productAdmin.modal.barcode')}
                id="barcode" name="barcode" type="text"
                value={currentProduct.barcode || ''}
                onChange={handleInputChange} error={errors.barcode}
              />
              <div>
                <label htmlFor="quantityType" className="block text-sm font-medium text-gray-700 mb-1">{t('productAdmin.modal.quantityType')}</label>
                <select
                  id="quantityType" name="quantityType"
                  value={currentProduct.quantityType || 'unit'}
                  onChange={handleInputChange}
                  className={`mt-1 block w-full px-3 py-2 bg-white border ${errors.quantityType ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm`}
                  required
                >
                  <option value="unit">{t('productAdmin.quantityUnit')}</option>
                  <option value="kg">{t('productAdmin.quantityKg')}</option>
                </select>
                {errors.quantityType && <p className="mt-1 text-xs text-red-500">{errors.quantityType}</p>}
              </div>
              <InputField
                label={t('productAdmin.modal.stock')}
                id="stock" name="stock" type="number"
                value={currentProduct.stock === undefined ? '' : String(currentProduct.stock)}
                onChange={handleInputChange} error={errors.stock}
                min="0" step="1" required
              />
               <div className="flex items-center space-x-2 rtl:space-x-reverse">
                <input
                  type="checkbox"
                  id="isVisible"
                  name="isVisible"
                  checked={currentProduct.isVisible === undefined ? true : currentProduct.isVisible}
                  onChange={handleInputChange}
                  className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                />
                <label htmlFor="isVisible" className="text-sm font-medium text-gray-700">
                  {t('productAdmin.modal.isVisibleLabel')}
                </label>
              </div>

              <div className="flex justify-end space-x-3 rtl:space-x-reverse pt-4">
                <Button type="button" variant="secondary" onClick={closeModal}>{t('productAdmin.modal.cancel')}</Button>
                <Button type="submit" variant="primary">{isEditMode ? t('productAdmin.modal.saveChanges') : t('productAdmin.modal.addProduct')}</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductAdminScreen;