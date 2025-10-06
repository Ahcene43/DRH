// js/admin-delivery.js
// إدارة أسعار التوصيل - دوال متقدمة

class DeliveryManager {
    constructor() {
        this.deliveryPrices = {};
        this.modifiedPrices = {};
        this.isLoading = false;
    }

    // تحميل أسعار التوصيل
    async loadDeliveryPrices() {
        if (this.isLoading) return;
        
        this.isLoading = true;
        this.showLoading(true);
        
        try {
            const prices = await window.firebaseService.getDeliveryPrices();
            this.deliveryPrices = prices;
            this.displayDeliveryPrices();
            this.updateStats();
            this.showSuccess('تم تحميل بيانات التوصيل بنجاح');
        } catch (error) {
            console.error('Error loading delivery prices:', error);
            this.showError('فشل في تحميل بيانات التوصيل');
            // استخدام البيانات الافتراضية في حالة الخطأ
            this.deliveryPrices = defaultDeliveryPrices.deliveryPrices || {};
            this.displayDeliveryPrices();
            this.updateStats();
        } finally {
            this.isLoading = false;
            this.showLoading(false);
        }
    }

    // عرض أسعار التوصيل في الجدول
    displayDeliveryPrices() {
        const tableBody = document.getElementById('deliveryTableBody');
        
        if (!tableBody) return;

        if (!Object.keys(this.deliveryPrices).length) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="4" style="text-align: center; padding: 2rem; color: #666;">
                        <i class="fas fa-inbox" style="font-size: 3rem; margin-bottom: 1rem; display: block;"></i>
                        لا توجد بيانات للعرض
                    </td>
                </tr>
            `;
            return;
        }

        // ترتيب الولايات أبجدياً
        const sortedWilayas = Object.keys(this.deliveryPrices).sort();
        
        tableBody.innerHTML = sortedWilayas.map(wilaya => {
            const prices = this.deliveryPrices[wilaya];
            const homePrice = prices.home || 0;
            const deskPrice = prices.desk || 0;
            
            return `
                <tr data-wilaya="${wilaya}">
                    <td>
                        <strong>${wilaya}</strong>
                        ${wilaya === "إختر الولاية" ? '<br><small style="color: #666;">(افتراضي)</small>' : ''}
                    </td>
                    <td>
                        <div class="price-input-container">
                            <input type="number" 
                                   class="price-input ${this.modifiedPrices[wilaya]?.home !== undefined ? 'modified' : ''}"
                                   value="${homePrice}" 
                                   min="0"
                                   onchange="deliveryManager.markAsModified('${wilaya}', 'home', this.value)"
                                   ${wilaya === "إختر الولاية" ? 'disabled' : ''}>
                            <span class="currency">دج</span>
                        </div>
                    </td>
                    <td>
                        <div class="price-input-container">
                            <input type="number" 
                                   class="price-input ${this.modifiedPrices[wilaya]?.desk !== undefined ? 'modified' : ''}"
                                   value="${deskPrice}" 
                                   min="0"
                                   onchange="deliveryManager.markAsModified('${wilaya}', 'desk', this.value)"
                                   ${wilaya === "إختر الولاية" ? 'disabled' : ''}>
                            <span class="currency">دج</span>
                        </div>
                    </td>
                    <td>
                        ${wilaya !== "إختر الولاية" ? `
                            <div class="action-buttons">
                                <button class="btn btn-save" onclick="deliveryManager.saveWilayaPrice('${wilaya}')" 
                                        title="حفظ التغييرات لهذه الولاية">
                                    <i class="fas fa-save"></i>
                                </button>
                                <button class="btn btn-delete" onclick="deliveryManager.deleteWilaya('${wilaya}')"
                                        title="حذف الولاية">
                                    <i class="fas fa-trash"></i>
                                </button>
                            </div>
                        ` : '<span style="color: #999;">غير مسموح</span>'}
                    </td>
                </tr>
            `;
        }).join('');
    }

    // تحديث الإحصائيات
    updateStats() {
        const wilayas = Object.keys(this.deliveryPrices).filter(w => w !== "إختر الولاية");
        const totalWilayas = wilayas.length;
        
        let totalHome = 0;
        let totalDesk = 0;
        let countHome = 0;
        let countDesk = 0;
        
        wilayas.forEach(wilaya => {
            const prices = this.deliveryPrices[wilaya];
            if (prices.home) {
                totalHome += prices.home;
                countHome++;
            }
            if (prices.desk) {
                totalDesk += prices.desk;
                countDesk++;
            }
        });
        
        const avgHomePrice = countHome ? Math.round(totalHome / countHome) : 0;
        const avgDeskPrice = countDesk ? Math.round(totalDesk / countDesk) : 0;
        
        // تحديث عناصر الإحصائيات
        const totalWilayasEl = document.getElementById('totalWilayas');
        const avgHomePriceEl = document.getElementById('avgHomePrice');
        const avgDeskPriceEl = document.getElementById('avgDeskPrice');
        
        if (totalWilayasEl) totalWilayasEl.textContent = totalWilayas;
        if (avgHomePriceEl) avgHomePriceEl.textContent = `${avgHomePrice} دج`;
        if (avgDeskPriceEl) avgDeskPriceEl.textContent = `${avgDeskPrice} دج`;
        
        // تحديث عدد التغييرات غير المحفوظة
        this.updatePendingChanges();
    }

    // تحديث عداد التغييرات غير المحفوظة
    updatePendingChanges() {
        const pendingChanges = Object.keys(this.modifiedPrices).length;
        const saveButton = document.querySelector('.btn-large');
        
        if (saveButton) {
            if (pendingChanges > 0) {
                saveButton.innerHTML = `<i class="fas fa-save"></i> حفظ التغييرات (${pendingChanges})`;
                saveButton.classList.add('has-changes');
            } else {
                saveButton.innerHTML = `<i class="fas fa-save"></i> حفظ جميع التغييرات`;
                saveButton.classList.remove('has-changes');
            }
        }
    }

    // تحديد الحقول المعدلة
    markAsModified(wilaya, type, value) {
        if (!this.modifiedPrices[wilaya]) {
            this.modifiedPrices[wilaya] = {};
        }
        
        const currentValue = this.deliveryPrices[wilaya]?.[type] || 0;
        const newValue = parseInt(value) || 0;
        
        // إذا كانت القيمة الجديدة مختلفة عن القيمة الحالية
        if (newValue !== currentValue) {
            this.modifiedPrices[wilaya][type] = newValue;
            
            // إضافة تأثير للحقل المعدل
            const input = document.querySelector(`[data-wilaya="${wilaya}"] input[onchange*="${type}"]`);
            if (input) {
                input.classList.add('modified');
            }
        } else {
            // إذا عادت القيمة إلى الأصلية، إزالة من التعديلات
            if (this.modifiedPrices[wilaya][type] !== undefined) {
                delete this.modifiedPrices[wilaya][type];
                if (Object.keys(this.modifiedPrices[wilaya]).length === 0) {
                    delete this.modifiedPrices[wilaya];
                }
                
                // إزالة تأثير التعديل
                const input = document.querySelector(`[data-wilaya="${wilaya}"] input[onchange*="${type}"]`);
                if (input) {
                    input.classList.remove('modified');
                }
            }
        }
        
        this.updatePendingChanges();
    }

    // إضافة ولاية جديدة
    async addNewWilaya() {
        const wilayaName = document.getElementById('newWilaya').value.trim();
        const homePrice = parseInt(document.getElementById('newHomePrice').value) || 0;
        const deskPrice = parseInt(document.getElementById('newDeskPrice').value) || 0;
        
        // التحقق من صحة البيانات
        if (!wilayaName) {
            this.showError('⚠️ الرجاء إدخال اسم الولاية');
            return;
        }
        
        if (wilayaName.length < 2) {
            this.showError('⚠️ اسم الولاية يجب أن يكون على الأقل حرفين');
            return;
        }
        
        if (this.deliveryPrices[wilayaName]) {
            this.showError('⚠️ هذه الولاية موجودة مسبقاً');
            return;
        }
        
        if (homePrice < 0 || deskPrice < 0) {
            this.showError('⚠️ أسعار التوصيل يجب أن تكون أرقام موجبة');
            return;
        }
        
        try {
            this.showLoading(true);
            
            // إضافة الولاية الجديدة إلى Firebase
            await window.firebaseService.updateWilayaPrice(wilayaName, homePrice, deskPrice);
            
            // تحديث البيانات المحلية
            this.deliveryPrices[wilayaName] = {
                home: homePrice,
                desk: deskPrice
            };
            
            this.showSuccess(`✅ تم إضافة ولاية "${wilayaName}" بنجاح!`);
            
            // إعادة تعيين الحقول
            document.getElementById('newWilaya').value = '';
            document.getElementById('newHomePrice').value = '';
            document.getElementById('newDeskPrice').value = '';
            
            // إعادة تحميل البيانات والعرض
            this.displayDeliveryPrices();
            this.updateStats();
            
        } catch (error) {
            console.error('Error adding wilaya:', error);
            this.showError('❌ خطأ في إضافة الولاية: ' + error.message);
        } finally {
            this.showLoading(false);
        }
    }

    // حفظ سعر ولاية محددة
    async saveWilayaPrice(wilaya) {
        const homeInput = document.querySelector(`[data-wilaya="${wilaya}"] input[onchange*="home"]`);
        const deskInput = document.querySelector(`[data-wilaya="${wilaya}"] input[onchange*="desk"]`);
        
        if (!homeInput || !deskInput) {
            this.showError('❌ لم يتم العثور على بيانات الولاية');
            return;
        }
        
        const homePrice = parseInt(homeInput.value) || 0;
        const deskPrice = parseInt(deskInput.value) || 0;
        
        try {
            this.showLoading(true);
            
            // تحديث البيانات في Firebase
            await window.firebaseService.updateWilayaPrice(wilaya, homePrice, deskPrice);
            
            // تحديث البيانات المحلية
            this.deliveryPrices[wilaya] = {
                home: homePrice,
                desk: deskPrice
            };
            
            // إزالة الولاية من قائمة التعديلات
            if (this.modifiedPrices[wilaya]) {
                delete this.modifiedPrices[wilaya];
            }
            
            // إزالة تأثير التعديل
            homeInput.classList.remove('modified');
            deskInput.classList.remove('modified');
            
            this.showSuccess(`✅ تم تحديث أسعار ولاية "${wilaya}" بنجاح!`);
            this.updatePendingChanges();
            this.updateStats();
            
        } catch (error) {
            console.error('Error saving wilaya price:', error);
            this.showError('❌ خطأ في تحديث أسعار الولاية: ' + error.message);
        } finally {
            this.showLoading(false);
        }
    }

    // حذف ولاية
    async deleteWilaya(wilaya) {
        if (!confirm(`هل أنت متأكد من حذف ولاية "${wilaya}"؟\n\nهذا الإجراء لا يمكن التراجع عنه.`)) {
            return;
        }
        
        try {
            this.showLoading(true);
            
            // حذف الولاية من Firebase
            await window.firebaseService.deleteWilaya(wilaya);
            
            // حذف الولاية من البيانات المحلية
            delete this.deliveryPrices[wilaya];
            
            // إزالة من قائمة التعديلات إذا كانت موجودة
            if (this.modifiedPrices[wilaya]) {
                delete this.modifiedPrices[wilaya];
            }
            
            this.showSuccess(`✅ تم حذف ولاية "${wilaya}" بنجاح!`);
            
            // إعادة تحميل البيانات والعرض
            this.displayDeliveryPrices();
            this.updateStats();
            this.updatePendingChanges();
            
        } catch (error) {
            console.error('Error deleting wilaya:', error);
            this.showError('❌ خطأ في حذف الولاية: ' + error.message);
        } finally {
            this.showLoading(false);
        }
    }

    // حفظ جميع التغييرات
    async saveAllPrices() {
        const pendingChanges = Object.keys(this.modifiedPrices).length;
        
        if (pendingChanges === 0) {
            this.showInfo('⚠️ لم تقم بإجراء أي تغييرات تحتاج للحفظ');
            return;
        }
        
        if (!confirm(`هل تريد حفظ ${pendingChanges} تغيير؟`)) {
            return;
        }
        
        try {
            this.showLoading(true);
            
            const updates = {};
            let successCount = 0;
            let errorCount = 0;
            
            // تجهيز جميع التحديثات
            Object.keys(this.modifiedPrices).forEach(wilaya => {
                const modifications = this.modifiedPrices[wilaya];
                
                if (modifications.home !== undefined) {
                    updates[`deliveryPrices/${wilaya}/home`] = modifications.home;
                }
                if (modifications.desk !== undefined) {
                    updates[`deliveryPrices/${wilaya}/desk`] = modifications.desk;
                }
            });
            
            // تطبيق جميع التحديثات مرة واحدة
            await firebase.database().ref().update(updates);
            
            // تحديث البيانات المحلية
            Object.keys(this.modifiedPrices).forEach(wilaya => {
                const modifications = this.modifiedPrices[wilaya];
                
                if (!this.deliveryPrices[wilaya]) {
                    this.deliveryPrices[wilaya] = {};
                }
                
                if (modifications.home !== undefined) {
                    this.deliveryPrices[wilaya].home = modifications.home;
                }
                if (modifications.desk !== undefined) {
                    this.deliveryPrices[wilaya].desk = modifications.desk;
                }
                
                successCount++;
            });
            
            // إعادة تعيين قائمة التعديلات
            this.modifiedPrices = {};
            
            this.showSuccess(`✅ تم حفظ ${successCount} تغيير بنجاح!`);
            
            // إعادة تحميل البيانات والعرض
            this.displayDeliveryPrices();
            this.updateStats();
            this.updatePendingChanges();
            
        } catch (error) {
            console.error('Error saving all prices:', error);
            this.showError('❌ خطأ في حفظ التغييرات: ' + error.message);
        } finally {
            this.showLoading(false);
        }
    }

    // استيراد بيانات من ملف
    async importFromFile(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        
        reader.onload = async (e) => {
            try {
                const data = JSON.parse(e.target.result);
                
                if (!data.deliveryPrices) {
                    this.showError('❌ ملف غير صالح - لا توجد بيانات توصيل');
                    return;
                }
                
                if (!confirm(`هل تريد استيراد بيانات ${Object.keys(data.deliveryPrices).length} ولاية؟`)) {
                    return;
                }
                
                this.showLoading(true);
                
                // استيراد البيانات إلى Firebase
                await window.firebaseService.updateDeliveryPrices(data.deliveryPrices);
                
                // تحديث البيانات المحلية
                this.deliveryPrices = data.deliveryPrices;
                
                this.showSuccess('✅ تم استيراد البيانات بنجاح!');
                
                // إعادة تحميل البيانات والعرض
                this.displayDeliveryPrices();
                this.updateStats();
                this.modifiedPrices = {};
                this.updatePendingChanges();
                
            } catch (error) {
                console.error('Error importing data:', error);
                this.showError('❌ خطأ في استيراد البيانات: ' + error.message);
            } finally {
                this.showLoading(false);
                // إعادة تعيين حقل الملف
                event.target.value = '';
            }
        };
        
        reader.onerror = () => {
            this.showError('❌ خطأ في قراءة الملف');
        };
        
        reader.readAsText(file);
    }

    // تصدير البيانات إلى ملف
    exportToFile() {
        const data = {
            deliveryPrices: this.deliveryPrices,
            exportDate: new Date().toLocaleString('ar-EG'),
            totalWilayas: Object.keys(this.deliveryPrices).length
        };
        
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        
        a.href = url;
        a.download = `delivery-prices-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        this.showSuccess('✅ تم تصدير البيانات بنجاح!');
    }

    // البحث في الولايات
    searchWilayas(searchTerm) {
        const rows = document.querySelectorAll('#deliveryTableBody tr');
        const term = searchTerm.toLowerCase().trim();
        
        rows.forEach(row => {
            const wilayaName = row.getAttribute('data-wilaya').toLowerCase();
            if (wilayaName.includes(term)) {
                row.style.display = '';
            } else {
                row.style.display = 'none';
            }
        });
    }

    // إظهار/إخفاء حالة التحميل
    showLoading(show) {
        const loadingElement = document.getElementById('loadingIndicator');
        const saveButton = document.querySelector('.btn-large');
        
        if (loadingElement) {
            loadingElement.style.display = show ? 'block' : 'none';
        }
        
        if (saveButton) {
            saveButton.disabled = show;
        }
    }

    // عرض رسائل النجاح
    showSuccess(message) {
        this.showMessage(message, 'success');
    }

    // عرض رسائل الخطأ
    showError(message) {
        this.showMessage(message, 'error');
    }

    // عرض رسائل المعلومات
    showInfo(message) {
        this.showMessage(message, 'info');
    }

    // عرض رسالة
    showMessage(message, type) {
        // إزالة أي رسائل سابقة
        const existingMessages = document.querySelectorAll('.delivery-message');
        existingMessages.forEach(msg => msg.remove());
        
        const messageDiv = document.createElement('div');
        messageDiv.className = `delivery-message delivery-${type}`;
        messageDiv.innerHTML = `
            <div class="message-content">
                <i class="fas fa-${this.getMessageIcon(type)}"></i>
                <span>${message}</span>
                <button class="message-close" onclick="this.parentElement.parentElement.remove()">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;
        
        document.querySelector('.delivery-admin').insertBefore(messageDiv, document.querySelector('.delivery-admin').firstChild);
        
        // إزالة تلقائية بعد 5 ثواني
        setTimeout(() => {
            if (messageDiv.parentElement) {
                messageDiv.remove();
            }
        }, 5000);
    }

    // الحصول على أيقونة الرسالة
    getMessageIcon(type) {
        const icons = {
            success: 'check-circle',
            error: 'exclamation-circle',
            info: 'info-circle'
        };
        return icons[type] || 'info-circle';
    }
}

// إنشاء نسخة عامة من مدير التوصيل
window.deliveryManager = new DeliveryManager();

// دوال عامة للاستخدام في HTML
window.addNewWilaya = function() {
    window.deliveryManager.addNewWilaya();
};

window.saveAllPrices = function() {
    window.deliveryManager.saveAllPrices();
};

window.importFromFile = function(event) {
    window.deliveryManager.importFromFile(event);
};

window.exportToFile = function() {
    window.deliveryManager.exportToFile();
};

window.searchWilayas = function() {
    const searchTerm = document.getElementById('searchWilaya').value;
    window.deliveryManager.searchWilayas(searchTerm);
};

// تهيئة عند تحميل الصفحة
document.addEventListener('DOMContentLoaded', function() {
    if (window.deliveryManager) {
        window.deliveryManager.loadDeliveryPrices();
        
        // إضافة شريط البحث إذا لم يكن موجوداً
        if (!document.getElementById('searchContainer')) {
            const adminHeader = document.querySelector('.admin-header');
            if (adminHeader) {
                const searchHtml = `
                    <div id="searchContainer" style="margin-top: 1rem;">
                        <div class="form-group" style="max-width: 300px;">
                            <input type="text" id="searchWilaya" placeholder="🔍 ابحث عن ولاية..." 
                                   oninput="searchWilayas()" style="width: 100%;">
                        </div>
                    </div>
                `;
                adminHeader.insertAdjacentHTML('afterend', searchHtml);
            }
        }
        
        // إضافة زر التصدير والاستيراد
        const actionsContainer = document.querySelector('.admin-header');
        if (actionsContainer && !document.getElementById('importExportButtons')) {
            const actionsHtml = `
                <div id="importExportButtons" style="display: flex; gap: 1rem; margin-top: 1rem;">
                    <div>
                        <input type="file" id="importFile" accept=".json" style="display: none;" onchange="importFromFile(event)">
                        <button class="btn btn-secondary" onclick="document.getElementById('importFile').click()">
                            <i class="fas fa-upload"></i> استيراد من ملف
                        </button>
                    </div>
                    <button class="btn btn-secondary" onclick="exportToFile()">
                        <i class="fas fa-download"></i> تصدير إلى ملف
                    </button>
                </div>
            `;
            actionsContainer.appendChild(document.createElement('div')).innerHTML = actionsHtml;
        }
        
        // إضافة مؤشر التحميل إذا لم يكن موجوداً
        if (!document.getElementById('loadingIndicator')) {
            const loadingHtml = `
                <div id="loadingIndicator" style="display: none; text-align: center; padding: 2rem; color: #666;">
                    <div class="loading-spinner" style="width: 40px; height: 40px; border: 4px solid #f3f3f3; border-top: 4px solid #4a90e2; border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto 1rem;"></div>
                    <p>جاري معالجة البيانات...</p>
                </div>
                <style>
                    @keyframes spin {
                        0% { transform: rotate(0deg); }
                        100% { transform: rotate(360deg); }
                    }
                </style>
            `;
            document.querySelector('.delivery-admin').insertAdjacentHTML('afterbegin', loadingHtml);
        }
        
        // إضافة أنماط إضافية
        const additionalStyles = `
            <style>
                .price-input-container {
                    position: relative;
                    display: inline-block;
                }
                
                .price-input {
                    padding-right: 40px;
                    text-align: center;
                }
                
                .price-input.modified {
                    border-color: #ffa500;
                    background-color: #fffaf0;
                }
                
                .currency {
                    position: absolute;
                    left: 10px;
                    top: 50%;
                    transform: translateY(-50%);
                    color: #666;
                    font-size: 0.9em;
                }
                
                .action-buttons {
                    display: flex;
                    gap: 0.5rem;
                    justify-content: center;
                }
                
                .btn-save {
                    background: #28a745;
                    color: white;
                    border: none;
                    padding: 6px 12px;
                    border-radius: 4px;
                    cursor: pointer;
                }
                
                .btn-save:hover {
                    background: #218838;
                }
                
                .btn-large.has-changes {
                    background: #ffa500;
                    animation: pulse 2s infinite;
                }
                
                @keyframes pulse {
                    0% { transform: scale(1); }
                    50% { transform: scale(1.05); }
                    100% { transform: scale(1); }
                }
                
                .delivery-message {
                    margin-bottom: 1rem;
                    border-radius: 8px;
                    overflow: hidden;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
                }
                
                .delivery-success {
                    background: #d4edda;
                    border: 1px solid #c3e6cb;
                    color: #155724;
                }
                
                .delivery-error {
                    background: #f8d7da;
                    border: 1px solid #f5c6cb;
                    color: #721c24;
                }
                
                .delivery-info {
                    background: #d1ecf1;
                    border: 1px solid #bee5eb;
                    color: #0c5460;
                }
                
                .message-content {
                    padding: 1rem;
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                }
                
                .message-close {
                    background: none;
                    border: none;
                    margin-right: auto;
                    cursor: pointer;
                    color: inherit;
                }
            </style>
        `;
        document.head.insertAdjacentHTML('beforeend', additionalStyles);
    }
});
