from django.contrib import admin

from .models import Cart, CartItem, Order, OrderItem


class CartItemInline(admin.TabularInline):
    model = CartItem
    extra = 0
    readonly_fields = ['subtotal']


@admin.register(Cart)
class CartAdmin(admin.ModelAdmin):
    list_display = ['user', 'total_items', 'total', 'created_at']
    list_filter = ['created_at']
    search_fields = ['user__username']
    inlines = [CartItemInline]


class OrderItemInline(admin.TabularInline):
    model = OrderItem
    extra = 0
    readonly_fields = ['subtotal']


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = ['id', 'user', 'status', 'total', 'created_at']
    list_editable = ['status']
    list_filter = ['status', 'created_at']
    search_fields = ['user__username', 'user__email', 'shipping_name', 'shipping_phone']
    list_select_related = ['user']
    date_hierarchy = 'created_at'
    readonly_fields = ['total', 'created_at', 'updated_at']
    inlines = [OrderItemInline]


@admin.register(OrderItem)
class OrderItemAdmin(admin.ModelAdmin):
    list_display = ['order', 'product', 'quantity', 'price', 'subtotal']
    search_fields = ['order__id', 'product__name']
    list_select_related = ['order', 'product']
    readonly_fields = ['subtotal']