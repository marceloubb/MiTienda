import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'mitienda.settings')
django.setup()

from products.models import Category, Product

# Limpiar datos anteriores
Product.objects.all().delete()
Category.objects.all().delete()

# URLs correctas de Unsplash
HERAMIENTAS_IMG = 'https://images.unsplash.com/photo-1581783898377-1c85bf937427?w=400&h=300&fit=crop'
ELECTRICIDAD_IMG = 'https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=400&h=300&fit=crop'
FIJACIONES_IMG = 'https://images.unsplash.com/photo-1504328345606-18bbc8c9d7d1?w=400&h=300&fit=crop'
PLOMERIA_IMG = 'https://images.unsplash.com/photo-1585704032915-c3400ca199e7?w=400&h=300&fit=crop'
PINTURAS_IMG = 'https://images.unsplash.com/photo-1562259929-b4e1fd3aef09?w=400&h=300&fit=crop'
CONSTRUCCION_IMG = 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=400&h=300&fit=crop'

# Crear categorías
categories_data = [
    {'name': 'Herramientas', 'description': 'Herramientas manuales y eléctricas', 'image': HERAMIENTAS_IMG},
    {'name': 'Electricidad', 'description': 'Material eléctrico y accesorios', 'image': ELECTRICIDAD_IMG},
    {'name': 'Fijaciones', 'description': 'Tornillos, clavos y sujetadores', 'image': FIJACIONES_IMG},
    {'name': 'Plomería', 'description': 'Tuberías, conexiones y grifería', 'image': PLOMERIA_IMG},
    {'name': 'Pinturas', 'description': 'Pinturas, brochas y accesorios', 'image': PINTURAS_IMG},
    {'name': 'Construcción', 'description': 'Materiales de construcción', 'image': CONSTRUCCION_IMG},
]

for cat_data in categories_data:
    Category.objects.get_or_create(name=cat_data['name'], defaults=cat_data)

print('Categorías creadas:', Category.objects.count())

# Obtener categorías
herramientas = Category.objects.get(name='Herramientas')
electricidad = Category.objects.get(name='Electricidad')
fijaciones = Category.objects.get(name='Fijaciones')
plomeria = Category.objects.get(name='Plomería')
pinturas = Category.objects.get(name='Pinturas')
construccion = Category.objects.get(name='Construcción')

# ============ HERRAMIENTAS ============
H1 = 'https://images.unsplash.com/photo-1581783898377-1c85bf937427?w=400&h=300&fit=crop'
H2 = 'https://images.unsplash.com/photo-1590343349062-5e7d5c3c8c1d?w=400&h=300&fit=crop'
H3 = 'https://images.unsplash.com/photo-1621905252507-b35492cc74b4?w=400&h=300&fit=crop'
H4 = 'https://images.unsplash.com/photo-1615811361523-6bd03d7748e7?w=400&h=300&fit=crop'
H5 = 'https://images.unsplash.com/photo-1572981779307-38b8cabb2407?w=400&h=300&fit=crop'
H6 = 'https://images.unsplash.com/photo-1586864387967-d02ef85d93e8?w=400&h=300&fit=crop'
H7 = 'https://images.unsplash.com/photo-1615811361523-6bd03d7748e7?w=400&h=300&fit=crop'
H8 = 'https://images.unsplash.com/photo-1581783898377-1c85bf937427?w=400&h=300&fit=crop'

# ============ ELECTRICIDAD ============
E1 = 'https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=400&h=300&fit=crop'
E2 = 'https://images.unsplash.com/photo-1621905251918-48416bd8575a?w=400&h=300&fit=crop'
E3 = 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=400&h=300&fit=crop'
E4 = 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=300&fit=crop'
E5 = 'https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=400&h=300&fit=crop'
E6 = 'https://images.unsplash.com/photo-1621905251918-48416bd8575a?w=400&h=300&fit=crop'
E7 = 'https://images.unsplash.com/photo-1524484485831-a92ffc0de03f?w=400&h=300&fit=crop'
E8 = 'https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=400&h=300&fit=crop'

# ============ FIJACIONES ============
F1 = 'https://images.unsplash.com/photo-1504328345606-18bbc8c9d7d1?w=400&h=300&fit=crop'
F2 = 'https://images.unsplash.com/photo-1504328345606-18bbc8c9d7d1?w=400&h=300&fit=crop'
F3 = 'https://images.unsplash.com/photo-1504328345606-18bbc8c9d7d1?w=400&h=300&fit=crop'
F4 = 'https://images.unsplash.com/photo-1504328345606-18bbc8c9d7d1?w=400&h=300&fit=crop'
F5 = 'https://images.unsplash.com/photo-1504328345606-18bbc8c9d7d1?w=400&h=300&fit=crop'
F6 = 'https://images.unsplash.com/photo-1504328345606-18bbc8c9d7d1?w=400&h=300&fit=crop'
F7 = 'https://images.unsplash.com/photo-1504328345606-18bbc8c9d7d1?w=400&h=300&fit=crop'
F8 = 'https://images.unsplash.com/photo-1504328345606-18bbc8c9d7d1?w=400&h=300&fit=crop'

# ============ PLOMERÍA ============
P1 = 'https://images.unsplash.com/photo-1585704032915-c3400ca199e7?w=400&h=300&fit=crop'
P2 = 'https://images.unsplash.com/photo-1585704032915-c3400ca199e7?w=400&h=300&fit=crop'
P3 = 'https://images.unsplash.com/photo-1585704032915-c3400ca199e7?w=400&h=300&fit=crop'
P4 = 'https://images.unsplash.com/photo-1585704032915-c3400ca199e7?w=400&h=300&fit=crop'
P5 = 'https://images.unsplash.com/photo-1585704032915-c3400ca199e7?w=400&h=300&fit=crop'
P6 = 'https://images.unsplash.com/photo-1585704032915-c3400ca199e7?w=400&h=300&fit=crop'
P7 = 'https://images.unsplash.com/photo-1585704032915-c3400ca199e7?w=400&h=300&fit=crop'
P8 = 'https://images.unsplash.com/photo-1585704032915-c3400ca199e7?w=400&h=300&fit=crop'

# ============ PINTURAS ============
PI1 = 'https://images.unsplash.com/photo-1562259929-b4e1fd3aef09?w=400&h=300&fit=crop'
PI2 = 'https://images.unsplash.com/photo-1562259929-b4e1fd3aef09?w=400&h=300&fit=crop'
PI3 = 'https://images.unsplash.com/photo-1562259929-b4e1fd3aef09?w=400&h=300&fit=crop'
PI4 = 'https://images.unsplash.com/photo-1562259929-b4e1fd3aef09?w=400&h=300&fit=crop'
PI5 = 'https://images.unsplash.com/photo-1562259929-b4e1fd3aef09?w=400&h=300&fit=crop'
PI6 = 'https://images.unsplash.com/photo-1562259929-b4e1fd3aef09?w=400&h=300&fit=crop'
PI7 = 'https://images.unsplash.com/photo-1562259929-b4e1fd3aef09?w=400&h=300&fit=crop'
PI8 = 'https://images.unsplash.com/photo-1562259929-b4e1fd3aef09?w=400&h=300&fit=crop'

# ============ CONSTRUCCIÓN ============
C1 = 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=400&h=300&fit=crop'
C2 = 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=400&h=300&fit=crop'
C3 = 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=400&h=300&fit=crop'
C4 = 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=400&h=300&fit=crop'
C5 = 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=400&h=300&fit=crop'
C6 = 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=400&h=300&fit=crop'
C7 = 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=400&h=300&fit=crop'
C8 = 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=400&h=300&fit=crop'

products_data = [
    # ============ HERRAMIENTAS ============
    {'name': 'Martillo Stanley 16oz', 'description': 'Martillo de uña con mango de acero forjado y empuñadura antideslizante. Ideal para trabajo profesional.', 'price': 389.00, 'original_price': 499.00, 'category': herramientas, 'stock': 45, 'is_featured': True, 'image': H1},
    {'name': 'Set Destornilladores DeWalt', 'description': 'Set de 8 destornilladores de precisión con puntas magnéticas y mango ergonómico.', 'price': 459.00, 'original_price': 599.00, 'category': herramientas, 'stock': 30, 'is_featured': True, 'image': H2},
    {'name': 'Llave Inglesa Bahco 12"', 'description': 'Llave ajustable cromada de alta resistencia con apertura de 30mm.', 'price': 529.00, 'original_price': 699.00, 'category': herramientas, 'stock': 25, 'is_featured': False, 'image': H3},
    {'name': 'Sierra Circular Bosch 7"', 'description': 'Sierra circular eléctrica de 1400W con corte de 65mm y guía láser.', 'price': 1899.00, 'original_price': 2399.00, 'category': herramientas, 'stock': 12, 'is_featured': True, 'image': H4},
    {'name': 'Taladro Percutor Makita 1/2"', 'description': 'Taladro percutor inalámbrico 18V con 2 velocidades y mandril autoajustable.', 'price': 1299.00, 'original_price': 1599.00, 'category': herramientas, 'stock': 18, 'is_featured': True, 'image': H5},
    {'name': 'Alicate Universal Truper', 'description': 'Alicate de corte lateral con mango PVC y acero templado.', 'price': 189.00, 'original_price': None, 'category': herramientas, 'stock': 60, 'is_featured': False, 'image': H6},
    {'name': 'Cinta Métrica Stanley 5m', 'description': 'Cinta métrica retráctil con cinta de acero de 25mm y gancho magnético.', 'price': 129.00, 'original_price': 169.00, 'category': herramientas, 'stock': 80, 'is_featured': False, 'image': H7},
    {'name': 'Nivel de Burbuja 60cm', 'description': 'Nivel de aluminio con 3 burbujas y superficie de lectura ampliada.', 'price': 249.00, 'original_price': None, 'category': herramientas, 'stock': 35, 'is_featured': False, 'image': H8},

    # ============ ELECTRICIDAD ============
    {'name': 'Cable THW 2.5mm x mt', 'description': 'Cable eléctrico terminal blindado de cobre para instalaciones residenciales.', 'price': 32.00, 'original_price': None, 'category': electricidad, 'stock': 1000, 'is_featured': False, 'image': E1},
    {'name': 'Tomacorriente Legrand Doble', 'description': 'Tomacorriente doble 110V con tierra y protección contra sobrecarga.', 'price': 129.00, 'original_price': 169.00, 'category': electricidad, 'stock': 150, 'is_featured': True, 'image': E2},
    {'name': 'Breaker Schneider 20A', 'description': 'Breaker termomagnético unipolar de 20 amperios con protección IR.', 'price': 189.00, 'original_price': 249.00, 'category': electricidad, 'stock': 75, 'is_featured': False, 'image': E3},
    {'name': 'Lámpara LED Philips 12W', 'description': 'Lámpara LED bombilla blanca natural de bajo consumo y alta luminosidad.', 'price': 45.00, 'original_price': None, 'category': electricidad, 'stock': 300, 'is_featured': True, 'image': E4},
    {'name': 'Guía Cable Conduit 20mm', 'description': 'Tubo conduit flexible de 20mm para cableado oculto.', 'price': 25.00, 'original_price': None, 'category': electricidad, 'stock': 500, 'is_featured': False, 'image': E5},
    {'name': 'Caja de Derivación 4x4', 'description': 'Caja de conexión plástica para empalmes eléctricos.', 'price': 18.00, 'original_price': None, 'category': electricidad, 'stock': 400, 'is_featured': False, 'image': E6},
    {'name': 'Interruptor Luminoso Legrand', 'description': 'Interruptor luminoso simple 10A con indicador LED.', 'price': 89.00, 'original_price': None, 'category': electricidad, 'stock': 120, 'is_featured': False, 'image': E7},
    {'name': 'Luminaria LED Panel 60x60', 'description': 'Panel LED cuadrado de 40W para plafón de oficina.', 'price': 459.00, 'original_price': 599.00, 'category': electricidad, 'stock': 20, 'is_featured': True, 'image': E8},

    # ============ FIJACIONES ============
    {'name': 'Tornillos Acero Inox #8 x 1"', 'description': 'Caja de 200 tornillos de acero inoxidable para exteriores.', 'price': 189.00, 'original_price': 259.00, 'category': fijaciones, 'stock': 80, 'is_featured': True, 'image': F1},
    {'name': 'Clavos de Acero 2" Caja 500g', 'description': 'Clavos de acero galvanizado para carpintería general.', 'price': 129.00, 'original_price': None, 'category': fijaciones, 'stock': 120, 'is_featured': False, 'image': F2},
    {'name': 'Anclaje Químico Sika 300ml', 'description': 'Resina epóxica bicomponente para anclajes de alta resistencia.', 'price': 289.00, 'original_price': 359.00, 'category': fijaciones, 'stock': 40, 'is_featured': True, 'image': F3},
    {'name': 'Tarugos nylon 6mm x 50', 'description': 'Tarugos expansores de nylon para paredes huecas y macizas.', 'price': 45.00, 'original_price': None, 'category': fijaciones, 'stock': 200, 'is_featured': False, 'image': F4},
    {'name': 'Bisagras Acero 3"', 'description': 'Par de bisagras de acero inoxidable para puertas y muebles.', 'price': 65.00, 'original_price': None, 'category': fijaciones, 'stock': 150, 'is_featured': False, 'image': F5},
    {'name': 'Chapas para Puerta 2"', 'description': 'Juego de 2 chapas para puertas de interior con tornillos.', 'price': 149.00, 'original_price': 199.00, 'category': fijaciones, 'stock': 60, 'is_featured': False, 'image': F6},
    {'name': 'Perno de Anclaje 1/2" x 10cm', 'description': 'Perno roscado galvanizado para estructuras pesadas.', 'price': 35.00, 'original_price': None, 'category': fijaciones, 'stock': 300, 'is_featured': False, 'image': F7},
    {'name': 'Abrazaderas para Cable x10', 'description': 'Abrazaderas de nylon para fijación de cables y mangueras.', 'price': 25.00, 'original_price': None, 'category': fijaciones, 'stock': 500, 'is_featured': False, 'image': F8},

    # ============ PLOMERÍA ============
    {'name': 'Tubería PVC 1/2" x 6m', 'description': 'Tubería PVC sanitaria presión para agua potable.', 'price': 55.00, 'original_price': None, 'category': plomeria, 'stock': 200, 'is_featured': False, 'image': P1},
    {'name': 'Llavín Lider Lasting 1/2"', 'description': 'Llavín cromado con llave y volante para lavabos.', 'price': 189.00, 'original_price': 259.00, 'category': plomeria, 'stock': 50, 'is_featured': True, 'image': P2},
    {'name': 'Cinta Teflón 12mm x 20m', 'description': 'Cinta teflón blanca para sellado de roscas hidráulicas.', 'price': 15.00, 'original_price': None, 'category': plomeria, 'stock': 500, 'is_featured': False, 'image': P3},
    {'name': 'Conexión PVC 1/2" Codo', 'description': 'Codo de 90° para tubería PVC de 1/2 pulgada.', 'price': 12.00, 'original_price': None, 'category': plomeria, 'stock': 800, 'is_featured': False, 'image': P4},
    {'name': 'Regadera Flexible 1.5m', 'description': 'Manguera flexible con acabado cromado para ducha.', 'price': 249.00, 'original_price': 329.00, 'category': plomeria, 'stock': 35, 'is_featured': True, 'image': P5},
    {'name': 'Válvula Esférica 1/2"', 'description': 'Válvula de corte esférica cromada para tubería.', 'price': 85.00, 'original_price': None, 'category': plomeria, 'stock': 70, 'is_featured': False, 'image': P6},
    {'name': 'Sifón Lavabo 32mm', 'description': 'Sifón de drenaje plástico para lavabos de baño.', 'price': 65.00, 'original_price': None, 'category': plomeria, 'stock': 90, 'is_featured': False, 'image': P7},
    {'name': 'Silicona Sanitaria Transparente', 'description': 'Silicona de secado rápido para baños y cocinas.', 'price': 45.00, 'original_price': None, 'category': plomeria, 'stock': 150, 'is_featured': False, 'image': P8},

    # ============ PINTURAS ============
    {'name': 'Pintura Látex Interior 1Gal', 'description': 'Pintura látex vinílica de alta cobertura color blanco.', 'price': 189.00, 'original_price': 249.00, 'category': pinturas, 'stock': 60, 'is_featured': True, 'image': PI1},
    {'name': 'Rodillo Felpa 9" con Marco', 'description': 'Rodillo de felpa para superficies lisas con marco y mango.', 'price': 89.00, 'original_price': None, 'category': pinturas, 'stock': 100, 'is_featured': False, 'image': PI2},
    {'name': 'Brocha 3" Cerdas Sintéticas', 'description': 'Brocha de 3 pulgadas para pintura látex y esmaltes.', 'price': 45.00, 'original_price': None, 'category': pinturas, 'stock': 120, 'is_featured': False, 'image': PI3},
    {'name': 'Masilla para Fisuras 500g', 'description': 'Masilla reparadora para grietas y fisuras en paredes.', 'price': 65.00, 'original_price': None, 'category': pinturas, 'stock': 80, 'is_featured': False, 'image': PI4},
    {'name': 'Pintura Antióxido 1/4 Gal', 'description': 'Pintura base de antióxido para superficies metálicas.', 'price': 145.00, 'original_price': 189.00, 'category': pinturas, 'stock': 45, 'is_featured': True, 'image': PI5},
    {'name': 'Thinner 1 Galón', 'description': 'Diluyente universal para pinturas al oleo y esmaltes.', 'price': 129.00, 'original_price': None, 'category': pinturas, 'stock': 70, 'is_featured': False, 'image': PI6},
    {'name': 'Cinta de Papel 48mm x 50m', 'description': 'Cinta de enmascarar para protección en pintura.', 'price': 35.00, 'original_price': None, 'category': pinturas, 'stock': 200, 'is_featured': False, 'image': PI7},
    {'name': 'Lija Grano 120 x10 hojas', 'description': 'Hojas de lija de agua para acabados finos.', 'price': 45.00, 'original_price': None, 'category': pinturas, 'stock': 300, 'is_featured': False, 'image': PI8},

    # ============ CONSTRUCCIÓN ============
    {'name': 'Cemento Portland 50kg', 'description': 'Saco de cemento gris de alta resistencia para obras generales.', 'price': 245.00, 'original_price': 289.00, 'category': construccion, 'stock': 300, 'is_featured': True, 'image': C1},
    {'name': 'Varilla de Acero #4 x 12m', 'description': 'Varilla corrugada de acero estructural para columnas y vigas.', 'price': 189.00, 'original_price': 229.00, 'category': construccion, 'stock': 200, 'is_featured': False, 'image': C2},
    {'name': 'Bloque de Concreto 14x20x40', 'description': 'Bloque hueco de concreto para muros divisorios.', 'price': 18.00, 'original_price': None, 'category': construccion, 'stock': 2000, 'is_featured': False, 'image': C3},
    {'name': 'Arena de Río x m³', 'description': 'Arena de río lavada para mezclas de concreto y mortero.', 'price': 450.00, 'original_price': None, 'category': construccion, 'stock': 50, 'is_featured': False, 'image': C4},
    {'name': 'Grava Chancada x m³', 'description': 'Grava chancada para preparación de concreto.', 'price': 480.00, 'original_price': None, 'category': construccion, 'stock': 50, 'is_featured': False, 'image': C5},
    {'name': 'Ladrillo Cerámico x 100', 'description': 'Paquete de 100 ladrillos cerámicos para mampostería.', 'price': 890.00, 'original_price': 999.00, 'category': construccion, 'stock': 40, 'is_featured': True, 'image': C6},
    {'name': 'Malla Electrosoldada 6x6', 'description': 'Malla de acero electrosoldada para losas y pavimentos.', 'price': 320.00, 'original_price': 399.00, 'category': construccion, 'stock': 60, 'is_featured': False, 'image': C7},
    {'name': 'Poliestireno Expandido 1m²', 'description': 'Placa de unicel para aislamiento térmico.', 'price': 120.00, 'original_price': None, 'category': construccion, 'stock': 100, 'is_featured': False, 'image': C8},
]

for p_data in products_data:
    Product.objects.get_or_create(name=p_data['name'], defaults=p_data)

print('Productos creados:', Product.objects.count())
print('Categorías:', Category.objects.count())
print('Destacados:', Product.objects.filter(is_featured=True).count())
print('En oferta:', Product.objects.filter(original_price__isnull=False).count())
