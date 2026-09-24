from django.db import models
from django.contrib.auth.models import User
from django.utils import timezone
from products.models import Product


class Cart(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='cart', verbose_name='Usuario')
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='Fecha de creación')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='Fecha de actualización')

    class Meta:
        verbose_name = 'Carrito'
        verbose_name_plural = 'Carritos'

    def __str__(self):
        return f'Carrito de {self.user.username}'

    @property
    def total(self):
        return sum(item.subtotal for item in self.items.all())

    @property
    def total_items(self):
        return sum(item.quantity for item in self.items.all())


class CartItem(models.Model):
    cart = models.ForeignKey(Cart, on_delete=models.CASCADE, related_name='items', verbose_name='Carrito')
    product = models.ForeignKey(Product, on_delete=models.CASCADE, verbose_name='Producto')
    quantity = models.IntegerField(default=1, verbose_name='Cantidad')
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='Fecha de creación')

    class Meta:
        verbose_name = 'Item del carrito'
        verbose_name_plural = 'Items del carrito'
        unique_together = ['cart', 'product']

    def __str__(self):
        return f'{self.quantity}x {self.product.name}'

    @property
    def subtotal(self):
        return self.product.price * self.quantity


class Order(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Pendiente'),
        ('processing', 'Procesando'),
        ('ready', 'Listo para despacho'),
        ('shipped', 'Enviado'),
        ('delivered', 'Entregado'),
        ('cancelled', 'Cancelado'),
        # Lateral blocked status: entered only via the bodega discrepancy
        # flag, left only by admin cancel or admin resolve.
        ('discrepancy', 'Discrepancia'),
    ]

    DISCREPANCY_REASON_CHOICES = [
        ('missing', 'Falta'),
        ('damaged', 'Dañado'),
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='orders', verbose_name='Usuario')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending', verbose_name='Estado')
    pre_discrepancy_status = models.CharField(
        max_length=20, null=True, blank=True,
        verbose_name='Estado previo a discrepancia',
    )
    discrepancy_reason = models.CharField(
        max_length=20, blank=True, default='',
        choices=DISCREPANCY_REASON_CHOICES,
        verbose_name='Razón de discrepancia',
    )
    total = models.DecimalField(max_digits=10, decimal_places=2, verbose_name='Total')
    
    # Información de envío
    shipping_name = models.CharField(max_length=200, verbose_name='Nombre de envío')
    shipping_address = models.TextField(verbose_name='Dirección de envío')
    shipping_city = models.CharField(max_length=100, verbose_name='Ciudad')
    shipping_postal_code = models.CharField(max_length=20, verbose_name='Código postal')
    shipping_phone = models.CharField(max_length=20, verbose_name='Teléfono')
    
    # Información de pago
    payment_method = models.CharField(max_length=50, verbose_name='Método de pago')
    
    notes = models.TextField(blank=True, verbose_name='Notas')
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='Fecha de creación')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='Fecha de actualización')

    class Meta:
        verbose_name = 'Pedido'
        verbose_name_plural = 'Pedidos'
        ordering = ['-created_at']

    def __str__(self):
        return f'Pedido #{self.id} - {self.user.username}'

    @property
    def status_display(self):
        return dict(self.STATUS_CHOICES).get(self.status, self.status)


class OrderItem(models.Model):
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name='items', verbose_name='Pedido')
    product = models.ForeignKey(Product, on_delete=models.CASCADE, verbose_name='Producto')
    quantity = models.IntegerField(verbose_name='Cantidad')
    price = models.DecimalField(max_digits=10, decimal_places=2, verbose_name='Precio')

    class Meta:
        verbose_name = 'Item del pedido'
        verbose_name_plural = 'Items del pedido'

    def __str__(self):
        return f'{self.quantity}x {self.product.name}'

    @property
    def subtotal(self):
        return self.price * self.quantity


class OrderEvent(models.Model):
    """Append-only record of one order status transition.

    Written inside the same transaction as the status change it describes.
    Timestamps always come from the server clock (default=timezone.now,
    editable=False); clients can never supply or override them.
    """

    EVENT_TYPE_CHOICES = [
        ('created', 'Creado'),
        ('advanced', 'Avanzado'),
        ('discrepancy', 'Discrepancia'),
        ('resolved', 'Resuelto'),
        ('cancelled', 'Cancelado'),
    ]

    order = models.ForeignKey(
        Order, on_delete=models.CASCADE,
        related_name='events', verbose_name='Pedido',
    )
    event_type = models.CharField(
        max_length=20, choices=EVENT_TYPE_CHOICES, verbose_name='Tipo de evento',
    )
    from_status = models.CharField(
        max_length=20, null=True, blank=True, verbose_name='Estado anterior',
    )
    to_status = models.CharField(max_length=20, verbose_name='Estado posterior')
    timestamp = models.DateTimeField(
        default=timezone.now, editable=False, verbose_name='Marca de tiempo',
    )

    class Meta:
        verbose_name = 'Evento del pedido'
        verbose_name_plural = 'Eventos del pedido'
        ordering = ['timestamp', 'id']
        indexes = [
            models.Index(fields=['order', 'timestamp'], name='orders_event_order_ts_idx'),
        ]

    def __str__(self):
        return f'{self.order_id} {self.event_type} {self.from_status} -> {self.to_status}'
