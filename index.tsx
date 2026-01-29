
import React, { useState, useEffect, useCallback } from 'react';
import { createRoot } from 'react-dom/client';
import { AppView, Transaction, Item, User } from './types';
import { STORAGE_KEY, INVENTORY_STORAGE_KEY, FIXED_ITEMS } from './constants';
import Navigation from './components/Navigation';
import BillingView from './components/BillingView';
import HistoryView from './components/HistoryView';
import InventoryView from './components/InventoryView';
import AuthView from './components/AuthView';

const USER_KEY = 'quickbill_user_profile';

const App = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentView, setCurrentView] = useState<AppView>('billing');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [isInitialLoadDone, setIsInitialLoadDone] = useState(false);

  // Initial Load from Storage
  useEffect(() => {
    const savedUser = localStorage.getItem(USER_KEY);
    if (savedUser) {
      setCurrentUser(JSON.parse(savedUser));
    }

    const savedTransactions = localStorage.getItem(STORAGE_KEY);
    if (savedTransactions) {
      try {
        setTransactions(JSON.parse(savedTransactions));
      } catch (e) { console.error("Transactions load failed", e); }
    }

    const savedInventory = localStorage.getItem(INVENTORY_STORAGE_KEY);
    if (savedInventory !== null) {
      try {
        const parsed = JSON.parse(savedInventory);
        // We trust the storage even if empty ([])
        setItems(Array.isArray(parsed) ? parsed : []);
      } catch (e) {
        console.error("Inventory load failed", e);
        setItems([]);
      }
    } else {
      setItems([...FIXED_ITEMS]);
    }
    setIsInitialLoadDone(true);
  }, []);

  // Sync to Storage
  useEffect(() => {
    if (isInitialLoadDone) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions));
    }
  }, [transactions, isInitialLoadDone]);

  useEffect(() => {
    if (isInitialLoadDone) {
      localStorage.setItem(INVENTORY_STORAGE_KEY, JSON.stringify(items));
    }
  }, [items, isInitialLoadDone]);

  const handleLogin = (user: User) => {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    setCurrentUser(user);
    setIsAuthenticated(true);
  };

  const handleSaveTransaction = useCallback((newTransaction: Transaction) => {
    setTransactions(prev => [...prev, newTransaction]);
    setTimeout(() => window.print(), 300);
  }, []);

  const handleDeleteTransaction = useCallback((transactionId: string) => {
    if (window.confirm("Permanently delete this record?")) {
      setTransactions(prev => prev.filter(t => t.id !== transactionId));
    }
  }, []);

  const handleDeleteItem = useCallback((itemId: string) => {
    if (window.confirm("Are you sure you want to delete this item?")) {
      setItems(prev => prev.filter(i => i.id !== itemId));
    }
  }, []);

  const handleAddItem = useCallback((newItem: Item) => {
    setItems(prev => [...prev, newItem]);
  }, []);

  const handleUpdateItem = useCallback((updatedItem: Item) => {
    setItems(prev => prev.map(item => item.id === updatedItem.id ? updatedItem : item));
  }, []);

  const handleClearAllData = useCallback(() => {
    if (window.confirm("CRITICAL: This will delete ALL items and ALL transaction history. Continue?")) {
      setItems([]);
      setTransactions([]);
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(INVENTORY_STORAGE_KEY);
      alert("All data cleared.");
    }
  }, []);

  if (!isAuthenticated) {
    return <AuthView onLogin={handleLogin} existingUser={currentUser} />;
  }

  const renderView = () => {
    switch (currentView) {
      case 'billing':
        return <BillingView items={items} onSaveTransaction={handleSaveTransaction} />;
      case 'history':
        return <HistoryView transactions={transactions} onDeleteTransaction={handleDeleteTransaction} />;
      case 'inventory':
        return <InventoryView items={items} onDeleteItem={handleDeleteItem} onAddItem={handleAddItem} onEditItem={handleUpdateItem} onClearAll={handleClearAllData} />;
      default:
        return <BillingView items={items} onSaveTransaction={handleSaveTransaction} />;
    }
  };

  const latestTransaction = transactions[transactions.length - 1];

  return (
    <div className="min-h-screen pb-24 bg-gray-50 text-gray-900 font-sans">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40 no-print shadow-sm">
        <div className="max-w-xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="text-2xl">⚡</span>
            <h1 className="text-xl font-bold tracking-tight text-gray-800">QuickBill <span className="text-gray-400 font-normal">Pro</span></h1>
          </div>
          <div className="text-right flex flex-col items-end">
             <span className="text-[8px] font-black text-blue-600 mb-0.5">{currentUser?.phone}</span>
            <span className="text-[10px] font-bold text-gray-500 bg-gray-100 px-2 py-1 rounded uppercase border border-gray-200">
              {new Date().toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
            </span>
          </div>
        </div>
      </header>

      <main className="max-w-xl mx-auto">
        {renderView()}
      </main>

      <Navigation currentView={currentView} onViewChange={setCurrentView} />

      <div className="print-only p-12 text-black bg-white">
        {latestTransaction && (
          <div className="space-y-6 max-w-md mx-auto border p-8">
            <div className="text-center border-b pb-4">
              <h1 className="text-2xl font-bold uppercase tracking-tighter">Business Receipt</h1>
              <p className="text-sm mt-1">{new Date(latestTransaction.timestamp).toLocaleString()}</p>
            </div>
            <div className="space-y-4">
              <div className="flex justify-between text-sm">
                <span className="font-bold">Customer:</span>
                <span>{latestTransaction.customerName || 'Walk-in Customer'}</span>
              </div>
              <div className="border-y border-dashed py-4 space-y-2">
                {latestTransaction.items.map(item => (
                  <div key={item.id} className="flex justify-between text-sm">
                    <span>{item.name} (x{item.quantity})</span>
                    <span className="font-mono">RS. {item.total.toFixed(2)}</span>
                  </div>
                ))}
              </div>
              <div className="flex justify-between font-bold text-lg pt-2 border-t border-double border-gray-900">
                <span>TOTAL AMOUNT</span>
                <span className="font-mono">RS. {latestTransaction.totalAmount.toFixed(2)}</span>
              </div>
            </div>
            <div className="text-center pt-8 text-xs italic text-gray-600">
              <p>Thank you for your business!</p>
              <p className="mt-1">Phone ID: {currentUser?.phone}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const root = createRoot(document.getElementById('root')!);
root.render(<App />);
