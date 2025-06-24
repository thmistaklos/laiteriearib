
import React, { useState, FormEvent, ChangeEvent, useRef } from 'react';
import { useAppContext } from '../contexts/AppContext';
import { Product } from '../types';
import { useTranslation } from '../hooks/useTranslation';
import Button from '../components/Button';
import InputField from '../components/InputField';
import { exportToCsv, exportToXlsx, exportToPdf } from '../utils/exportUtils';
import Papa from 'papaparse';

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
    };
    
    let success = false;
    setConfirmationAlert(null); // Clear previous alerts

    if (isEditMode && currentProduct.id) {
      try {
        await updateProduct(currentProduct.id, productData);
        success = true;
        setConfirmationAlert(t('productAdmin.productUpdatedSuccess', { defaultValue: "Product updated successfully."}));
      } catch (error) {
        console.error("Error updating product:", error);
        setConfirmationAlert(t('productAdmin.productSaveFailed', { defaultValue: "Failed to update product."}));
      }
    } else {
      try {
        const newProd = await addProduct(productData as Product);
        if (newProd) {
          success = true;
          setConfirmationAlert(t('productAdmin.productAddedSuccess', { defaultValue: "Product added successfully."}));
        } else {
          setConfirmationAlert(t('productAdmin.productSaveFailed', { defaultValue: "Failed to add product."}));
        }
      } catch (error) {
         console.error("Error adding product:", error);
         setConfirmationAlert(t('productAdmin.productSaveFailed', { defaultValue: "Failed to add product."}));
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
        // No need to set hasPendingConfirmation for delete, or decide if it should trigger "confirm saves"
      } catch (error) {
        console.error("Error deleting product:", error);
        setConfirmationAlert(t('productAdmin.productDeleteFailed', { defaultValue: "Failed to delete product."}));
      }
       setTimeout(() => {
        setConfirmationAlert(null);
      }, 3000);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setCurrentProduct(prev => ({ 
        ...prev, 
        [name]: (name === 'price' || name === 'stock') ? parseFloat(value) : value 
    }));
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
      stock: p.stock !== undefined ? p.stock : ''
    }));

    const filename = `products_export_${new Date().toISOString().split('T')[0]}`;

    try {
      if (format === 'csv') {
        exportToCsv(dataToExport, filename);
      } else if (format === 'xlsx') {
        exportToXlsx(dataToExport, filename, 'Products');
      } else if (format === 'pdf') {
        const headers = [[t('productAdmin.table.name'), t('productAdmin.table.price'), t('productAdmin.table.stock'), t('productAdmin.table.type')]];
        const body = dataToExport.map(p => [
          p.name,
          p.price !== '' ? t('currency.format', { amount: Number(p.price).toFixed(2) }) : 'N/A',
          p.stock,
          p.quantityType === 'kg' ? t('productAdmin.quantityKg') : t('productAdmin.quantityUnit')
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
      complete: async (results) => { // Make complete callback async
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

            return {
              id: id || undefined, 
              name: name || undefined,
              description: description || undefined,
              price,
              imageUrl: imageUrl || undefined,
              barcode: barcode || undefined,
              quantityType: finalQuantityType,
              stock,
            };
          });

          const importedProducts = mappedProducts.filter(p => 
            Object.values(p).some(val => val !== undefined && (typeof val === 'string' ? val.trim() !== '' : true))
          );

          if (importedProducts.length > 0) {
            await bulkAddProducts(importedProducts); // Await the async operation
            setImportSuccess(t('productAdmin.import.success', { count: importedProducts.length }));
            setHasPendingConfirmation(true); // Set after successful bulk add
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

        {confirmationAlert && <div className="mb-4 p-3 bg-green-100 text-green-700 rounded-md animate-pulse">{confirmationAlert}</div>}
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
                  <th className="px-6 py-3 text-left rtl:text-right text-xs font-medium text-gray-500 uppercase tracking-wider">{t('productAdmin.table.actions')}</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {products.map(product => (
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
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2 rtl:space-x-reverse">
                      <Button onClick={() => openModalForEdit(product)} variant="secondary" size="sm">{t('productAdmin.edit')}</Button>
                      <Button onClick={() => handleDelete(product.id)} variant="danger" size="sm">{t('productAdmin.delete')}</Button>
                    </td>
                  </tr>
                ))}
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
                  id="imageUrl" name="imageUrlFile" type="file"
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
                {errors.imageUrl && <p className="mt-1 text-xs text-red-500">{errors.imageUrl}</p>}
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
