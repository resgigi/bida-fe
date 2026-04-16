import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { HiOutlinePlus, HiOutlinePencil, HiOutlineTrash, HiOutlineSearch } from 'react-icons/hi';
import api from '../../services/api';
import useAuthStore from '../../stores/authStore';
import { formatVND } from '../../utils/format';
import Modal from '../../components/Modal';
import ConfirmDialog from '../../components/ConfirmDialog';

function ProductForm({ product, categories, onClose }) {
  const [form, setForm] = useState({
    name: product?.name || '', code: product?.code || '', categoryId: product?.categoryId || categories[0]?.id || '',
    price: product?.price || 0, stock: product?.stock || 0, isActive: product?.isActive !== false,
  });
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: (data) => product ? api.put(`/products/${product.id}`, data) : api.post('/products', data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['products'] }); toast.success(product ? 'Đã cập nhật' : 'Đã tạo sản phẩm'); onClose(); },
    onError: (err) => toast.error(err.response?.data?.message || 'Lỗi'),
  });
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  return (
    <form onSubmit={(e) => { e.preventDefault(); mutation.mutate({ ...form, price: Number(form.price), stock: Number(form.stock) }); }} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div><label className="block text-sm font-medium text-gray-700 mb-1">Tên</label><input value={form.name} onChange={(e) => set('name', e.target.value)} className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none text-sm" required /></div>
        <div><label className="block text-sm font-medium text-gray-700 mb-1">Mã</label><input value={form.code} onChange={(e) => set('code', e.target.value)} className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none text-sm" required /></div>
      </div>
      <div><label className="block text-sm font-medium text-gray-700 mb-1">Danh mục</label><select value={form.categoryId} onChange={(e) => set('categoryId', e.target.value)} className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none text-sm">{categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
      <div className="grid grid-cols-2 gap-4">
        <div><label className="block text-sm font-medium text-gray-700 mb-1">Giá (VND)</label><input type="number" value={form.price} onChange={(e) => set('price', e.target.value)} className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none text-sm" min="0" /></div>
        <div><label className="block text-sm font-medium text-gray-700 mb-1">Tồn kho</label><input type="number" value={form.stock} onChange={(e) => set('stock', e.target.value)} className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none text-sm" min="0" /></div>
      </div>
      <label className="flex items-center gap-2"><input type="checkbox" checked={form.isActive} onChange={(e) => set('isActive', e.target.checked)} className="rounded" /><span className="text-sm text-gray-700">Đang kinh doanh</span></label>
      <div className="flex gap-3 justify-end pt-2">
        <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 text-sm font-medium">Hủy</button>
        <button type="submit" disabled={mutation.isPending} className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 text-sm font-medium">{mutation.isPending ? 'Đang lưu...' : 'Lưu'}</button>
      </div>
    </form>
  );
}

function CategoryManager() {
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const queryClient = useQueryClient();
  const { data: categories = [] } = useQuery({ queryKey: ['categories'], queryFn: () => api.get('/products/categories').then((r) => r.data.data) });
  const addMutation = useMutation({ mutationFn: (d) => api.post('/products/categories', d), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['categories'] }); setName(''); setCode(''); toast.success('Đã tạo'); }, onError: (e) => toast.error(e.response?.data?.message || 'Lỗi') });
  const delMutation = useMutation({ mutationFn: (id) => api.delete(`/products/categories/${id}`), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['categories'] }); toast.success('Đã xóa'); }, onError: (e) => toast.error(e.response?.data?.message || 'Lỗi') });
  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Tên danh mục" className="flex-1 px-3 py-2 rounded-lg border border-gray-300 text-sm outline-none focus:ring-2 focus:ring-blue-500" />
        <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="Mã" className="w-24 px-3 py-2 rounded-lg border border-gray-300 text-sm outline-none focus:ring-2 focus:ring-blue-500" />
        <button onClick={() => name && code && addMutation.mutate({ name, code })} className="px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"><HiOutlinePlus className="w-5 h-5" /></button>
      </div>
      {categories.map((c) => (
        <div key={c.id} className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg">
          <span className="text-sm font-medium">{c.name} <span className="text-gray-400">({c.code})</span></span>
          <button onClick={() => delMutation.mutate(c.id)} className="text-red-400 hover:text-red-600 p-1"><HiOutlineTrash className="w-4 h-4" /></button>
        </div>
      ))}
    </div>
  );
}

export default function ProductsPage() {
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editProduct, setEditProduct] = useState(null);
  const [deleteProduct, setDeleteProduct] = useState(null);
  const [showCategories, setShowCategories] = useState(false);
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'SUPER_ADMIN' || user?.role === 'MANAGER';
  const queryClient = useQueryClient();

  const {
    data: products = [],
    isLoading: productsLoading,
    isError: productsError,
    error: productsErrorObj,
  } = useQuery({ queryKey: ['products', search], queryFn: () => api.get('/products', { params: search ? { search } : {} }).then((r) => r.data.data) });
  const {
    data: categories = [],
    isLoading: categoriesLoading,
  } = useQuery({ queryKey: ['categories'], queryFn: () => api.get('/products/categories').then((r) => r.data.data) });
  const deleteMutation = useMutation({ mutationFn: (id) => api.delete(`/products/${id}`), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['products'] }); toast.success('Đã xóa'); } });

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-2xl font-bold text-gray-800">Sản phẩm</h2>
        {isAdmin && (
          <div className="flex gap-2">
            <button onClick={() => setShowCategories(true)} className="px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 text-sm">Danh mục</button>
            <button onClick={() => { setEditProduct(null); setShowForm(true); }} className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 text-sm"><HiOutlinePlus className="w-5 h-5" />Thêm sản phẩm</button>
          </div>
        )}
      </div>
      <div className="relative"><HiOutlineSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Tìm kiếm sản phẩm..." className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-200 bg-white focus:ring-2 focus:ring-blue-500 outline-none text-sm" /></div>
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="bg-gray-50 border-b border-gray-200">
            <th className="text-left py-3 px-4 font-medium text-gray-500">Tên</th><th className="text-left py-3 px-4 font-medium text-gray-500">Mã</th><th className="text-left py-3 px-4 font-medium text-gray-500">Danh mục</th><th className="text-right py-3 px-4 font-medium text-gray-500">Giá</th><th className="text-right py-3 px-4 font-medium text-gray-500">Tồn</th>{isAdmin && <th className="text-right py-3 px-4 font-medium text-gray-500">Thao tác</th>}
          </tr></thead>
          <tbody>
            {productsLoading && <tr><td colSpan={6} className="py-8 text-center text-gray-400">Đang tải sản phẩm...</td></tr>}
            {productsError && <tr><td colSpan={6} className="py-8 text-center text-red-500">{productsErrorObj?.response?.data?.message || 'Không thể tải danh sách sản phẩm'}</td></tr>}
            {products.map((p) => (
              <tr key={p.id} className="border-b border-gray-50 hover:bg-gray-50">
                <td className="py-3 px-4 font-medium">{p.name}{!p.isActive && <span className="ml-2 text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">Ngừng KD</span>}</td>
                <td className="py-3 px-4 text-gray-500">{p.code}</td>
                <td className="py-3 px-4 text-gray-500">{p.category?.name}</td>
                <td className="py-3 px-4 text-right font-medium">{formatVND(p.price)}</td>
                <td className="py-3 px-4 text-right">{p.stock}</td>
                {isAdmin && <td className="py-3 px-4 text-right">
                  <button onClick={() => { setEditProduct(p); setShowForm(true); }} className="p-1.5 rounded hover:bg-gray-100 text-gray-500"><HiOutlinePencil className="w-4 h-4" /></button>
                  <button onClick={() => setDeleteProduct(p)} className="p-1.5 rounded hover:bg-red-50 text-red-400"><HiOutlineTrash className="w-4 h-4" /></button>
                </td>}
              </tr>
            ))}
            {!productsLoading && !productsError && products.length === 0 && <tr><td colSpan={6} className="py-8 text-center text-gray-400">Chưa có sản phẩm</td></tr>}
          </tbody>
        </table>
      </div>
      <Modal isOpen={showForm} onClose={() => setShowForm(false)} title={editProduct ? 'Sửa sản phẩm' : 'Thêm sản phẩm'}>
        {categoriesLoading ? <p className="text-sm text-gray-500">Đang tải danh mục...</p> : <ProductForm product={editProduct} categories={categories} onClose={() => setShowForm(false)} />}
      </Modal>
      <Modal isOpen={showCategories} onClose={() => setShowCategories(false)} title="Quản lý danh mục"><CategoryManager /></Modal>
      <ConfirmDialog isOpen={!!deleteProduct} onClose={() => setDeleteProduct(null)} onConfirm={() => deleteMutation.mutate(deleteProduct.id)} title="Xóa sản phẩm" message={`Xóa "${deleteProduct?.name}"?`} confirmText="Xóa" danger />
    </div>
  );
}
