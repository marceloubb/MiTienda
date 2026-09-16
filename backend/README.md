# MiTienda - Backend API

Backend Django REST Framework para la tienda online MiTienda.

## Requisitos
- Python 3.12
- uv (gestor de paquetes)

## Instalación

```bash
# Crear entorno virtual
uv venv --python 3.12

# Activar entorno virtual
# Windows:
.venv\Scripts\activate
# Linux/Mac:
source .venv/bin/activate

# Instalar dependencias
uv pip install -r requirements.txt

# Ejecutar migraciones
python manage.py migrate

# Crear datos de prueba
python seed_data.py

# Crear superusuario (opcional)
python manage.py createsuperuser
```

## Ejecutar servidor

```bash
python manage.py runserver 8000
```

## API Endpoints

### Productos
- `GET /api/products/` - Listar productos
- `GET /api/products/{id}/` - Detalle de producto
- `GET /api/products/featured/` - Productos destacados
- `GET /api/products/on_sale/` - Productos en oferta

### Categorías
- `GET /api/categories/` - Listar categorías

### Carrito (requiere autenticación)
- `GET /api/cart/` - Ver carrito
- `POST /api/cart/add_item/` - Agregar producto
- `POST /api/cart/remove_item/` - Quitar producto
- `POST /api/cart/update_item/` - Actualizar cantidad
- `POST /api/cart/clear/` - Limpiar carrito

### Pedidos (requiere autenticación)
- `GET /api/orders/` - Listar pedidos
- `POST /api/orders/create_from_cart/` - Crear pedido desde carrito

### Usuarios
- `POST /api/users/register/` - Registrar usuario
- `POST /api/users/login/` - Iniciar sesión
- `GET /api/users/profile/` - Ver perfil
- `PUT /api/users/profile/` - Actualizar perfil
- `POST /api/users/logout/` - Cerrar sesión

## Datos de Prueba

El script `seed_data.py` crea:
- 6 categorías de ferretería
- 18 productos con diferentes precios y stock
- 5 productos destacados
- 8 productos en oferta

## Credenciales Admin

- URL: http://localhost:8000/admin/
- Usuario: admin
- Contraseña: admin123
