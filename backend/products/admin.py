from django.contrib import admin
from django.db.models import Count

from .models import Category, Product


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ['name', 'is_active', 'product_count', 'created_at']
    list_filter = ['is_active']
    search_fields = ['name', 'description']
    readonly_fields = ['created_at', 'updated_at']

    def get_queryset(self, request):
        return super().get_queryset(request).annotate(
            product_count=Count('products')
        )

    @admin.display(description='Product count')
    def product_count(self, obj):
        return obj.product_count


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = [
        'name', 'category', 'price', 'original_price', 'stock',
        'is_active', 'is_featured', 'is_on_sale', 'created_at',
    ]
    list_editable = ['price', 'original_price', 'stock', 'is_active', 'is_featured']
    list_filter = ['category', 'is_active', 'is_featured']
    search_fields = ['name', 'description']
    list_select_related = ['category']
    readonly_fields = ['created_at', 'updated_at']