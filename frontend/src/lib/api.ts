/**
 * API client for Django backend
 */
import axios from 'axios';

// API base URL
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

// Create axios instance
export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If 401 and not already retried, try to refresh token
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem('refresh_token');
        if (refreshToken) {
          const response = await axios.post(`${API_BASE_URL}/auth/token/refresh/`, {
            refresh: refreshToken,
          });

          const { access } = response.data;
          localStorage.setItem('access_token', access);

          // Retry original request with new token
          originalRequest.headers.Authorization = `Bearer ${access}`;
          return axios(originalRequest);
        }
      } catch (refreshError) {
        // Refresh failed, logout user
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('user');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

// Authentication API
export const authAPI = {
  register: (data: any) => api.post('/auth/register/', data),
  login: (data: any) => api.post('/auth/login/', data),
  logout: (refreshToken: string) => api.post('/auth/logout/', { refresh_token: refreshToken }),
  getCurrentUser: () => api.get('/auth/user/'),
  changePassword: (data: any) => api.post('/auth/change-password/', data),
};

// Procurement API
export const procurementAPI = {
  // Suppliers
  getSuppliers: (params?: any) => api.get('/procurement/suppliers/', { params }),
  getSupplier: (id: number) => api.get(`/procurement/suppliers/${id}/`),
  createSupplier: (data: any) => api.post('/procurement/suppliers/', data),
  updateSupplier: (id: number, data: any) => api.patch(`/procurement/suppliers/${id}/`, data),
  deleteSupplier: (id: number) => api.delete(`/procurement/suppliers/${id}/`),

  // Categories
  getCategories: (params?: any) => api.get('/procurement/categories/', { params }),
  getCategory: (id: number) => api.get(`/procurement/categories/${id}/`),
  createCategory: (data: any) => api.post('/procurement/categories/', data),
  updateCategory: (id: number, data: any) => api.patch(`/procurement/categories/${id}/`, data),
  deleteCategory: (id: number) => api.delete(`/procurement/categories/${id}/`),

  // Transactions
  getTransactions: (params?: any) => api.get('/procurement/transactions/', { params }),
  getTransaction: (id: number) => api.get(`/procurement/transactions/${id}/`),
  createTransaction: (data: any) => api.post('/procurement/transactions/', data),
  updateTransaction: (id: number, data: any) => api.patch(`/procurement/transactions/${id}/`, data),
  deleteTransaction: (id: number) => api.delete(`/procurement/transactions/${id}/`),
  uploadCSV: (file: File, skipDuplicates: boolean = true) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('skip_duplicates', String(skipDuplicates));
    return api.post('/procurement/transactions/upload_csv/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  bulkDelete: (ids: number[]) => api.post('/procurement/transactions/bulk_delete/', { ids }),
  exportCSV: (params?: any) => api.get('/procurement/transactions/export/', {
    params,
    responseType: 'blob',
  }),

  // Uploads
  getUploads: (params?: any) => api.get('/procurement/uploads/', { params }),
};

// Analytics API
export const analyticsAPI = {
  getOverview: () => api.get('/analytics/overview/'),
  getSpendByCategory: () => api.get('/analytics/spend-by-category/'),
  getSpendBySupplier: () => api.get('/analytics/spend-by-supplier/'),
  getMonthlyTrend: (months: number = 12) => api.get('/analytics/monthly-trend/', { params: { months } }),
  getParetoAnalysis: () => api.get('/analytics/pareto/'),
  getTailSpend: (threshold: number = 20) => api.get('/analytics/tail-spend/', { params: { threshold } }),
  getStratification: () => api.get('/analytics/stratification/'),
  getSeasonality: () => api.get('/analytics/seasonality/'),
  getYearOverYear: () => api.get('/analytics/year-over-year/'),
  getConsolidation: () => api.get('/analytics/consolidation/'),
};

export default api;
