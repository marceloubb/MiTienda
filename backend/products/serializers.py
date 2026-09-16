from rest_framework import serializers
from .models import Category, Product


class CategorySerializer(serializers.ModelSerializer):
    products_count = serializers.SerializerMethodField()

    class Meta:
        model = Category
        fields = ['id', 'name', 'description', 'image', 'is_active', 'products_count', 'created_at', 'updated_at']

    def get_products_count(self, obj):
        return obj.products.filter(is_active=True).count()


class ProductSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source='category.name', read_only=True)
    discount_percentage = serializers.ReadOnlyField()
    is_on_sale = serializers.ReadOnlyField()

    class Meta:
        model = Product
        fields = [
            'id', 'name', 'description', 'price', 'original_price',
            'image', 'category', 'category_name', 'stock',
            'is_active', 'is_featured', 'discount_percentage', 'is_on_sale',
            'created_at', 'updated_at'
        ]


class ProductListSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source='category.name', read_only=True)
    discount_percentage = serializers.ReadOnlyField()
    is_on_sale = serializers.ReadOnlyField()

    class Meta:
        model = Product
        fields = [
            'id', 'name', 'price', 'original_price', 'image',
            'category', 'category_name', 'stock', 'is_featured',
            'discount_percentage', 'is_on_sale'
        ]
