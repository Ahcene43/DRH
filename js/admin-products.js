// js/admin-products.js
// إدارة المنتجات - دوال متقدمة

class ProductsManager {
  constructor() {
    this.currentEditingProduct = null;
  }

  // تحميل جميع المنتجات
  async loadAllProducts() {
    try {
      const products = await window.firebaseService.getProducts();
      this.displayProducts(products);
      this.updateProductsCount(products.length);
      return products;
    } catch (error) {
      console.error('Error loading products:', error);
      this.showError('فشل في تحميل المنتجات');
      return [];
    }
  }

  // عرض المنتجات في الشبكة
  displayProducts(products) {
    const grid = document.getElementById('productsGrid');
    
    if (!products || products.length === 0) {
      grid.innerHTML = `
        <div class="no-products">
          <i class="fas fa-tshirt" style="font-size: 4rem; color: #ccc; margin-bottom: 1rem;"></i>
          <h3>لا توجد منتجات</h3>
          <p>قم بإضافة منتجك الأول لبدء البيع</p>
        </div>
      `;
      return;
    }

    grid.innerHTML = products.map(product => `
      <div class="product-card" data-product-id="${product.id}">
        <img src="${product.image}" alt="${product.name}" 
             class="product-image"
             onerror="this.src='https://via.placeholder.com/350x250?text=صورة+غير+متاحة'">
        <div class="product-info">
          <div class="product-name">${product.name}</div>
          <div class="product-price">${product.price} دج</div>
          <div class="product-description">${product.description || 'لا يوجد وصف'}</div>
          
          <div class="product-meta">
            <span><i class="fas fa-palette"></i> ${product.colors ? product.colors.length : 0} ألوان</span>
            <span><i class="fas fa-ruler"></i> ${product.sizes ? product.sizes.length : 0} مقاسات</span>
            <span class="status-${product.active ? 'active' : 'inactive'}">
              ${product.active ? '🟢 نشط' : '🔴 غير نشط'}
            </span>
          </div>

          <div class="product-details">
            ${product.colors ? `
              <div class="detail-section">
                <strong>الألوان:</strong>
                <div class="colors-list">
                  ${product.colors.map(color => `
                    <span class="color-chip" style="background: ${this.getColorValue(color)}"></span>
                  `).join('')}
                </div>
              </div>
            ` : ''}
            
            ${product.sizes ? `
              <div class="detail-section">
                <strong>المقاسات:</strong>
                <div class="sizes-list">
                  ${product.sizes.map(size => `
                    <span class="size-chip ${size.available ? '' : 'unavailable'}">
                      ${size.size} (${size.age})
                    </span>
                  `).join('')}
                </div>
              </div>
            ` : ''}
          </div>

          <div class="product-actions">
            <button class="btn btn-edit" onclick="productsManager.editProduct('${product.id}')">
              <i class="fas fa-edit"></i> تعديل
            </button>
            <button class="btn btn-toggle" onclick="productsManager.toggleProduct('${product.id}', ${!product.active})">
              <i class="fas fa-power-off"></i> ${product.active ? 'إيقاف' : 'تفعيل'}
            </button>
            <button class="btn btn-delete" onclick="productsManager.deleteProduct('${product.id}')">
              <i class="fas fa-trash"></i> حذف
            </button>
          </div>
        </div>
      </div>
    `).join('');
  }

  // الحصول على قيمة اللون من الاسم
  getColorValue(colorName) {
    const colors = defaultProducts.colors;
    const color = colors.find(c => c.name === colorName);
    return color ? color.value : '#cccccc';
  }

  // تحديث عداد المنتجات
  updateProductsCount(count) {
    const countElement = document.getElementById('productsCount');
    if (countElement) {
      countElement.textContent = `عدد المنتجات: ${count}`;
    }
  }

  // تبديل حالة المنتج (نشط/غير نشط)
  async toggleProduct(productId, newStatus) {
    try {
      const result = await window.firebaseService.updateProduct(productId, { 
        active: newStatus 
      });
      
      if (result.success) {
        this.showSuccess(`تم ${newStatus ? 'تفعيل' : 'إيقاف'} المنتج بنجاح`);
        this.loadAllProducts();
      } else {
        this.showError('فشل في تحديث حالة المنتج');
      }
    } catch (error) {
      console.error('Error toggling product:', error);
      this.showError('فشل في تحديث حالة المنتج');
    }
  }

  // حذف منتج
  async deleteProduct(productId) {
    if (!confirm('هل أنت متأكد من حذف هذا المنتج؟ لا يمكن التراجع عن هذا الإجراء.')) {
      return;
    }

    try {
      const result = await window.firebaseService.deleteProduct(productId);
      
      if (result.success) {
        this.showSuccess('تم حذف المنتج بنجاح');
        this.loadAllProducts();
      } else {
        this.showError('فشل في حذف المنتج');
      }
    } catch (error) {
      console.error('Error deleting product:', error);
      this.showError('فشل في حذف المنتج');
    }
  }

  // تحرير منتج
  async editProduct(productId) {
    try {
      const products = await window.firebaseService.getProducts();
      const product = products.find(p => p.id === productId);
      
      if (!product) {
        this.showError('المنتج غير موجود');
        return;
      }

      this.currentEditingProduct = product;
      this.loadProductIntoForm(product);
      this.scrollToForm();
      
    } catch (error) {
      console.error('Error loading product for editing:', error);
      this.showError('فشل في تحميل بيانات المنتج');
    }
  }

  // تحميل بيانات المنتج في الفورم للتعديل
  loadProductIntoForm(product) {
    document.getElementById('productName').value = product.name || '';
    document.getElementById('productPrice').value = product.price || '';
    document.getElementById('productImage').value = product.image || '';
    document.getElementById('productDescription').value = product.description || '';
    document.getElementById('productActive').checked = product.active !== false;

    // تحميل الألوان
    const colorsContainer = document.getElementById('colorsContainer');
    colorsContainer.innerHTML = '';
    
    if (product.colors && product.colors.length > 0) {
      product.colors.forEach(colorName => {
        const color = defaultProducts.colors.find(c => c.name === colorName);
        this.addColorField(colorName, color ? color.value : '#FFFFFF');
      });
    } else {
      this.addColorField('أبيض', '#FFFFFF');
      this.addColorField('أسود', '#000000');
    }

    // تحميل المقاسات
    const sizesContainer = document.getElementById('sizesContainer');
    sizesContainer.innerHTML = '';
    
    if (product.sizes && product.sizes.length > 0) {
      product.sizes.forEach(size => {
        this.addSizeField(size.size, size.age);
      });
    } else {
      this.addSizeField('S1', '6-7 سنوات');
      this.addSizeField('S2', '8-9 سنوات');
    }

    // تغيير نص زر الحفظ
    const submitBtn = document.querySelector('#productForm button[type="submit"]');
    submitBtn.innerHTML = '<i class="fas fa-save"></i> تحديث المنتج';
    submitBtn.onclick = (e) => this.updateProduct(e);
  }

  // تحديث منتج موجود
  async updateProduct(e) {
    e.preventDefault();
    
    if (!this.currentEditingProduct) {
      this.showError('لا يوجد منتج للتحديث');
      return;
    }

    const productData = this.collectFormData();
    
    try {
      const result = await window.firebaseService.updateProduct(
        this.currentEditingProduct.id, 
        productData
      );
      
      if (result.success) {
        this.showSuccess('تم تحديث المنتج بنجاح');
        this.resetForm();
        this.loadAllProducts();
        this.currentEditingProduct = null;
      } else {
        this.showError('فشل في تحديث المنتج: ' + (result.error || ''));
      }
    } catch (error) {
      console.error('Error updating product:', error);
      this.showError('فشل في تحديث المنتج');
    }
  }

  // جمع بيانات الفورم
  collectFormData() {
    return {
      name: document.getElementById('productName').value,
      price: parseInt(document.getElementById('productPrice').value),
      image: document.getElementById('productImage').value,
      description: document.getElementById('productDescription').value,
      active: document.getElementById('productActive').checked,
      colors: this.collectColors(),
      sizes: this.collectSizes()
    };
  }

  // جمع الألوان من الفورم
  collectColors() {
    const colors = [];
    document.querySelectorAll('#colorsContainer .color-item').forEach(item => {
      const inputs = item.querySelectorAll('input');
      const colorName = inputs[1].value.trim();
      if (colorName) {
        colors.push(colorName);
      }
    });
    return colors;
  }

  // جمع المقاسات من الفورم
  collectSizes() {
    const sizes = [];
    document.querySelectorAll('#sizesContainer .form-row').forEach(item => {
      const inputs = item.querySelectorAll('input[type="text"]');
      const size = inputs[0].value.trim();
      const age = inputs[1].value.trim();
      
      if (size && age) {
        sizes.push({
          size: size,
          age: age,
          available: true
        });
      }
    });
    return sizes;
  }

  // إعادة تعيين الفورم
  resetForm() {
    document.getElementById('productForm').reset();
    
    // إعادة تعيين الحقول الديناميكية
    document.getElementById('colorsContainer').innerHTML = '';
    document.getElementById('sizesContainer').innerHTML = '';
    
    // إعادة تعيين العداد
    window.colorsCount = 0;
    window.sizesCount = 0;
    
    // إضافة حقول افتراضية
    this.addColorField('أبيض', '#FFFFFF');
    this.addColorField('أسود', '#000000');
    this.addSizeField('S1', '6-7 سنوات');
    this.addSizeField('S2', '8-9 سنوات');
    
    // إعادة تعيين زر الحفظ
    const submitBtn = document.querySelector('#productForm button[type="submit"]');
    submitBtn.innerHTML = '<i class="fas fa-save"></i> حفظ المنتج';
    submitBtn.onclick = (e) => this.addNewProduct(e);
  }

  // إضافة حقل لون
  addColorField(colorName = '', colorValue = '#FFFFFF') {
    if (!window.colorsCount) window.colorsCount = 0;
    window.colorsCount++;
    
    const colorId = `color${window.colorsCount}`;
    const colorsContainer = document.getElementById('colorsContainer');
    
    const colorHtml = `
      <div class="color-item" id="${colorId}">
        <input type="color" value="${colorValue}" 
               onchange="document.getElementById('${colorId}').querySelector('input[type=text]').value = this.value">
        <input type="text" placeholder="اسم اللون" value="${colorName}" style="flex:1;">
        <button type="button" class="btn btn-delete" onclick="this.parentElement.remove()">
          <i class="fas fa-times"></i>
        </button>
      </div>
    `;
    
    colorsContainer.insertAdjacentHTML('beforeend', colorHtml);
  }

  // إضافة حقل مقاس
  addSizeField(size = '', age = '') {
    if (!window.sizesCount) window.sizesCount = 0;
    window.sizesCount++;
    
    const sizeId = `size${window.sizesCount}`;
    const sizesContainer = document.getElementById('sizesContainer');
    
    const sizeHtml = `
      <div class="form-row" id="${sizeId}">
        <div class="form-group">
          <input type="text" placeholder="المقاس (مثال: S1)" value="${size}">
        </div>
        <div class="form-group">
          <input type="text" placeholder="العمر (مثال: 6-7 سنوات)" value="${age}">
        </div>
        <div class="form-group">
          <button type="button" class="btn btn-delete" onclick="document.getElementById('${sizeId}').remove()">
            <i class="fas fa-times"></i>
          </button>
        </div>
      </div>
    `;
    
    sizesContainer.insertAdjacentHTML('beforeend', sizeHtml);
  }

  // التمرير إلى الفورم
  scrollToForm() {
    document.getElementById('productForm').scrollIntoView({ 
      behavior: 'smooth' 
    });
  }

  // عرض رسائل النجاح
  showSuccess(message) {
    this.showMessage(message, 'success');
  }

  // عرض رسائل الخطأ
  showError(message) {
    this.showMessage(message, 'error');
  }

  // عرض رسالة
  showMessage(message, type) {
    const messageDiv = document.createElement('div');
    messageDiv.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 1rem 2rem;
      border-radius: 8px;
      color: white;
      font-weight: bold;
      z-index: 10000;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      animation: slideIn 0.3s ease;
    `;
    
    messageDiv.style.background = type === 'success' ? '#28a745' : '#dc3545';
    messageDiv.textContent = message;
    
    document.body.appendChild(messageDiv);
    
    setTimeout(() => {
      messageDiv.remove();
    }, 3000);
  }
}

// إنشاء نسخة عامة من مدير المنتجات
window.productsManager = new ProductsManager();

// دوال عامة للاستخدام في HTML
window.addColorField = function() {
  window.productsManager.addColorField();
};

window.addSizeField = function() {
  window.productsManager.addSizeField();
};

// تهيئة عند تحميل الصفحة
document.addEventListener('DOMContentLoaded', function() {
  if (window.productsManager) {
    window.productsManager.loadAllProducts();
    
    // إضافة حقول افتراضية
    window.productsManager.addColorField('أبيض', '#FFFFFF');
    window.productsManager.addColorField('أسود', '#000000');
    window.productsManager.addSizeField('S1', '6-7 سنوات');
    window.productsManager.addSizeField('S2', '8-9 سنوات');
    
    // إعداد حدث إضافة منتج جديد
    document.getElementById('productForm').onsubmit = function(e) {
      e.preventDefault();
      window.productsManager.addNewProduct(e);
    };
  }
});
