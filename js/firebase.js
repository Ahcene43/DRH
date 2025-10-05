// js/firebase.js
// خدمة Firebase الموسعة مع كل الدوال المطلوبة

(function () {
  // إعدادات Firebase
  const firebaseConfig = {
    apiKey: "AIzaSyD0ft0WLOoSI_gIeRfPcOrk6M5QWDhXDJ4",
    authDomain: "koka-888c8.firebaseapp.com",
    databaseURL: "https://koka-888c8-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "koka-888c8",
    storageBucket: "koka-888c8.firebasestorage.app",
    messagingSenderId: "625698485689",
    appId: "1:625698485689:web:1667934b75691ee223b268",
    measurementId: "G-78SQER5MY6"
  };

  // تهيئة Firebase
  if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
  }

  class FirebaseService {
    constructor() {
      this.database = firebase.database();
      console.log('✅ FirebaseService جاهز!');
    }

    // ========== إدارة المنتجات ==========
    
    async addProduct(product) {
      try {
        const newRef = this.database.ref('products').push();
        await newRef.set({
          ...product,
          id: newRef.key,
          createdAt: firebase.database.ServerValue.TIMESTAMP,
          updatedAt: firebase.database.ServerValue.TIMESTAMP
        });
        return { success: true, id: newRef.key };
      } catch (err) {
        console.error('addProduct error', err);
        return { success: false, error: err.message };
      }
    }

    async getProducts() {
      try {
        const snap = await this.database.ref('products').once('value');
        const val = snap.val() || {};
        // إرجاع كمصفوفة مع الحفاظ على الترتيب
        return Object.keys(val).map(k => ({ id: k, ...val[k] }))
          .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      } catch (err) {
        console.error('getProducts error', err);
        return [];
      }
    }

    async updateProduct(productId, updatedData) {
      try {
        await this.database.ref(`products/${productId}`).update({
          ...updatedData,
          updatedAt: firebase.database.ServerValue.TIMESTAMP
        });
        return { success: true };
      } catch (err) {
        console.error('updateProduct error', err);
        return { success: false, error: err.message };
      }
    }

    async deleteProduct(productId) {
      try {
        await this.database.ref(`products/${productId}`).remove();
        return { success: true };
      } catch (err) {
        console.error('deleteProduct error', err);
        return { success: false, error: err.message };
      }
    }

    // ========== إدارة الطلبات ==========
    
    async getDeliveryOrders() {
      try {
        const snap = await this.database.ref('deliveryOrders').once('value');
        const val = snap.val() || {};
        return Object.keys(val).map(k => ({ id: k, ...val[k] }))
          .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      } catch (err) {
        console.error('getDeliveryOrders error', err);
        return [];
      }
    }

    async addDeliveryOrder(order) {
      try {
        const newRef = this.database.ref('deliveryOrders').push();
        await newRef.set({
          ...order,
          id: newRef.key,
          status: 'pending',
          createdAt: firebase.database.ServerValue.TIMESTAMP,
          date: new Date().toLocaleString('ar-EG')
        });
        return { success: true, id: newRef.key };
      } catch (err) {
        console.error('addDeliveryOrder error', err);
        return { success: false, error: err.message };
      }
    }

    async updateOrderStatus(orderId, status) {
      try {
        await this.database.ref(`deliveryOrders/${orderId}`).update({ 
          status,
          updatedAt: firebase.database.ServerValue.TIMESTAMP
        });
        return { success: true };
      } catch (err) {
        console.error('updateOrderStatus error', err);
        return { success: false, error: err.message };
      }
    }

    async deleteOrder(orderId) {
      try {
        await this.database.ref(`deliveryOrders/${orderId}`).remove();
        return { success: true };
      } catch (err) {
        console.error('deleteOrder error', err);
        return { success: false, error: err.message };
      }
    }

    // ========== إدارة أسعار التوصيل ==========
    
    async getDeliveryPrices() {
      try {
        const snap = await this.database.ref('deliveryPrices').once('value');
        return snap.val() || {};
      } catch (err) {
        console.error('getDeliveryPrices error', err);
        return {};
      }
    }

    async updateDeliveryPrices(prices) {
      try {
        await this.database.ref('deliveryPrices').set(prices);
        return { success: true };
      } catch (err) {
        console.error('updateDeliveryPrices error', err);
        return { success: false, error: err.message };
      }
    }

    async updateWilayaPrice(wilaya, homePrice, deskPrice) {
      try {
        await this.database.ref(`deliveryPrices/${wilaya}`).set({
          home: homePrice,
          desk: deskPrice
        });
        return { success: true };
      } catch (err) {
        console.error('updateWilayaPrice error', err);
        return { success: false, error: err.message };
      }
    }

    async deleteWilaya(wilaya) {
      try {
        await this.database.ref(`deliveryPrices/${wilaya}`).remove();
        return { success: true };
      } catch (err) {
        console.error('deleteWilaya error', err);
        return { success: false, error: err.message };
      }
    }

    // ========== إحصائيات وتقارير ==========
    
    async getStats() {
      try {
        const [orders, products] = await Promise.all([
          this.getDeliveryOrders(),
          this.getProducts()
        ]);

        const totalOrders = orders.length;
        const pendingOrders = orders.filter(o => o.status === 'pending').length;
        const completedOrders = orders.filter(o => o.status === 'completed').length;
        const totalProducts = products.length;
        const activeProducts = products.filter(p => p.active).length;

        // حساب إجمالي المبيعات
        const totalSales = orders
          .filter(o => o.status === 'completed')
          .reduce((sum, order) => sum + (parseInt(order.total) || 0), 0);

        return {
          totalOrders,
          pendingOrders,
          completedOrders,
          totalProducts,
          activeProducts,
          totalSales
        };
      } catch (err) {
        console.error('getStats error', err);
        return {};
      }
    }

    // ========== النسخ الاحتياطي والاستعادة ==========
    
    async exportData() {
      try {
        const [products, orders, deliveryPrices] = await Promise.all([
          this.getProducts(),
          this.getDeliveryOrders(),
          this.getDeliveryPrices()
        ]);

        return {
          products,
          orders,
          deliveryPrices,
          exportDate: new Date().toISOString(),
          version: '1.0'
        };
      } catch (err) {
        console.error('exportData error', err);
        return null;
      }
    }

    async importData(data) {
      try {
        if (data.products) {
          await this.database.ref('products').set(data.products);
        }
        if (data.deliveryPrices) {
          await this.database.ref('deliveryPrices').set(data.deliveryPrices);
        }
        // لا نستورد الطلبات للحفاظ على سلامة البيانات
        return { success: true };
      } catch (err) {
        console.error('importData error', err);
        return { success: false, error: err.message };
      }
    }
  }

  // إنشاء نسخة عامة من الخدمة
  window.firebaseService = new FirebaseService();
})();
