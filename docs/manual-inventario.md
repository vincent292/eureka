# Manual de uso del módulo de Inventario - Eureka Play & Coffee

## 1. Introducción

El módulo de **Inventario** permite administrar insumos, ingredientes, productos internos, materias primas, bebidas, empaques, utensilios y cualquier elemento que el negocio necesite controlar.

Este módulo está pensado para negocios gastronómicos como cafeterías, pizzerías, restaurantes, bares, alitas, hamburguesas, pastas o negocios similares.

En la versión actual, Inventario funciona de forma **independiente** de productos y pedidos. Es decir, todavía no descuenta ingredientes automáticamente cuando se vende un producto. Por ahora sirve para registrar y controlar stock desde el panel administrador.

Con Inventario puedes:

- Crear categorías y subcategorías.
- Crear unidades de medida.
- Crear ubicaciones internas.
- Registrar proveedores.
- Crear ítems o insumos.
- Registrar entradas, salidas, ajustes y mermas.
- Manejar lotes y fechas de vencimiento.
- Hacer conteos de inventario.
- Ver alertas.
- Revisar reportes.
- Exportar datos a CSV y PDF.

## 2. Acceso al módulo

### Cómo ingresar

1. Ingresa al panel administrador de Eureka.
2. Inicia sesión con una cuenta autorizada.
3. En el menú lateral izquierdo, busca la opción **Inventario**.
4. Haz clic en **Inventario** para abrir el módulo.

### Quién puede entrar

El acceso está pensado para usuarios con rol:

- **admin**
- **super_admin**

Los usuarios normales no deben tener acceso a esta sección.

### Qué pasa si no tienes permisos

Si el usuario no tiene permisos de administrador, no debería poder entrar al panel admin ni administrar inventario. Además, la base de datos tiene reglas de seguridad para evitar escritura pública sobre las tablas de inventario.

## 3. Vista principal del inventario

Al entrar al módulo se muestra una pantalla con encabezado, botones principales, tarjetas de resumen y pestañas de navegación.

### Encabezado

El encabezado muestra:

- Título: **Inventario**
- Subtítulo: control global de insumos, lotes, movimientos y reportes.
- Botón **Nuevo ítem**.
- Botón **Registrar entrada**.
- Botón **Registrar merma**.
- Botón **CSV** para exportar el inventario actual.

### Tarjetas de resumen

La vista muestra tarjetas con indicadores importantes:

| Tarjeta | Qué significa |
| --- | --- |
| Total de ítems | Cantidad de insumos registrados. |
| Stock bajo | Ítems cuyo stock está igual o por debajo del mínimo. |
| Sin stock | Ítems con stock igual o menor a cero. |
| Próximos a vencer | Lotes que vencen dentro del rango de alerta. |
| Valor inventario | Valor estimado según stock actual y costo unitario. |

### Pestañas disponibles

El módulo tiene las siguientes pestañas:

- **Resumen**
- **Ítems**
- **Categorías**
- **Lotes**
- **Movimientos**
- **Conteos**
- **Alertas**
- **Reportes**
- **Proveedores**

### Buscador y filtros

En la sección de ítems puedes buscar por nombre o SKU. También hay filtros para revisar información por categoría, ubicación, estado y reportes.

### Estados visuales de stock

El sistema puede marcar ítems según su situación:

| Estado | Significado |
| --- | --- |
| Disponible | Tiene stock suficiente. |
| Stock bajo | Está por debajo o igual al stock mínimo. |
| Sin stock | No hay unidades disponibles. |
| Inactivo | El ítem está desactivado. |
| Reorden | El stock llegó al punto de reorden configurado. |
| Exceso | El stock superó el máximo configurado. |

## 4. Categorías y subcategorías

Las categorías sirven para organizar los ítems del inventario.

Ejemplos de categorías:

- Carnes
- Bebidas
- Lácteos
- Secos
- Empaques
- Limpieza
- Otros

Las subcategorías son divisiones internas dentro de una categoría.

Ejemplo:

| Nivel | Ejemplo |
| --- | --- |
| Categoría | Carnes |
| Subcategoría | Pollo |
| Ítem | Alitas de pollo |

### Cómo crear una categoría

1. Entra a **Inventario**.
2. Abre la pestaña **Categorías**.
3. Usa el formulario de categoría.
4. Escribe el nombre.
5. Agrega descripción si corresponde.
6. Puedes elegir color, icono y orden.
7. Guarda los cambios.

### Cómo crear una subcategoría

1. Entra a **Inventario**.
2. Abre **Categorías**.
3. Crea o edita una categoría.
4. Selecciona una categoría padre en el campo correspondiente.
5. Guarda.

### Cómo editar una categoría

1. Ve a la lista de categorías.
2. Selecciona la categoría.
3. Modifica los campos necesarios.
4. Guarda los cambios.

### Cómo desactivar una categoría

Puedes marcar una categoría como inactiva. Esto es recomendable cuando ya fue usada y no quieres perder historial.

### Cómo eliminar una categoría

El sistema permite eliminar categorías solo si no tienen dependencias importantes.

No se puede eliminar una categoría si:

- Tiene subcategorías asociadas.
- Tiene ítems asociados.

En esos casos, primero debes mover, desactivar o eliminar los elementos relacionados.

### Recomendaciones

- Usa categorías simples y fáciles de entender.
- No dupliques categorías con nombres parecidos.
- Para productos perecederos, usa categorías claras como Carnes, Lácteos, Frutas o Verduras.
- Para insumos no comestibles, usa categorías como Empaques o Limpieza.

## 5. Unidades de medida

Las unidades indican cómo se mide cada ítem.

Ejemplos:

- unidad
- kg
- g
- litro
- ml
- botella
- caja
- paquete
- lata
- porción

### Cómo crear una unidad

1. Entra a **Inventario**.
2. Abre la pestaña **Proveedores**.
3. Busca el bloque de **Unidades**.
4. Ingresa nombre, abreviatura y tipo.
5. Marca si es unidad base cuando corresponda.
6. Guarda.

### Tipos de unidades disponibles

| Tipo | Uso recomendado |
| --- | --- |
| unit | Unidades simples como pieza, unidad o docena. |
| weight | Peso, por ejemplo gramos o kilos. |
| volume | Volumen, por ejemplo litros o mililitros. |
| package | Cajas, paquetes, bolsas o botellas. |
| other | Cualquier medida especial. |

### Ejemplos prácticos

| Ítem | Unidad recomendada |
| --- | --- |
| Leche | litro |
| Café | gramo o kilogramo |
| Huevos | unidad |
| Gaseosas | botella |
| Harina | kilogramo |
| Vasos | unidad o paquete |

### Importante sobre conversiones

La base de datos ya tiene una tabla preparada para conversiones de unidades, por ejemplo 1 kg = 1000 g. Sin embargo, en la interfaz actual todavía no existe una pantalla completa para crear o editar conversiones.

## 6. Ubicaciones

Las ubicaciones representan lugares físicos donde se guarda inventario.

Ejemplos:

- Almacén principal
- Cocina
- Barra
- Freezer
- Refrigerador
- Depósito seco

### Cómo crear una ubicación

1. Entra a **Inventario**.
2. Abre la pestaña **Proveedores**.
3. Busca el bloque de **Ubicaciones**.
4. Ingresa nombre y descripción.
5. Guarda.

### Cómo asignar ubicación a un ítem

1. Crea o edita un ítem.
2. Busca el campo **Ubicación**.
3. Selecciona la ubicación correspondiente.
4. Guarda.

### Para qué sirve controlar ubicaciones

Las ubicaciones ayudan a saber dónde se encuentra cada insumo. Por ejemplo:

- Alitas en Freezer.
- Café en Barra.
- Harina en Depósito seco.
- Leche en Refrigerador.

### Limitación actual

La versión actual permite asignar ubicación a ítems y lotes, y permite registrar movimientos de transferencia. Sin embargo, todavía no maneja un saldo detallado de stock separado por ubicación. El stock principal del ítem es global.

## 7. Proveedores

Un proveedor es una persona o empresa que entrega productos o insumos al negocio.

Ejemplos:

- Proveedor de carnes.
- Proveedor de lácteos.
- Distribuidora de bebidas.
- Mayorista de empaques.

### Cómo agregar un proveedor

1. Entra a **Inventario**.
2. Abre la pestaña **Proveedores**.
3. Busca el formulario de proveedor.
4. Ingresa los datos disponibles.
5. Guarda.

### Datos que se pueden guardar

- Nombre del proveedor.
- Nombre de contacto.
- Teléfono.
- Correo.
- Dirección.
- Notas.
- Estado activo o inactivo.

### Cómo se usa un proveedor

El proveedor puede asociarse a entradas y lotes. Esto ayuda a saber de dónde vino una compra o lote específico.

## 8. Ítems o insumos de inventario

Un ítem es cualquier elemento que deseas controlar.

Ejemplos:

- Alitas de pollo.
- Café molido.
- Leche entera.
- Azúcar.
- Harina.
- Queso.
- Gaseosa 500 ml.
- Vasos plásticos.
- Servilletas.

### Cómo crear un nuevo ítem

1. Entra a **Inventario**.
2. Haz clic en **Nuevo ítem**.
3. Completa los datos del formulario.
4. Guarda.

### Campos del ítem

| Campo | Descripción |
| --- | --- |
| Nombre | Nombre principal del insumo. Es obligatorio. |
| SKU | Código interno opcional para identificar el ítem. |
| Descripción | Detalle adicional del ítem. |
| Categoría | Categoría o subcategoría a la que pertenece. Es obligatoria. |
| Unidad | Unidad principal del ítem. Es obligatoria. |
| Stock actual | Cantidad disponible actualmente. |
| Stock mínimo | Cantidad mínima recomendada. |
| Stock máximo | Cantidad máxima recomendada. Es opcional. |
| Punto de reorden | Nivel desde el cual conviene volver a comprar. |
| Costo unitario | Costo por unidad del ítem. |
| Ubicación | Lugar donde normalmente se guarda. |
| Maneja lotes | Indica si el ítem debe trabajar por lotes. |
| Maneja vencimiento | Indica si el ítem tiene fecha de vencimiento. |
| Usa FIFO | Indica si se recomienda consumir primero lo más antiguo. |
| Imagen o ruta | Campo para guardar una ruta de imagen. |
| Notas | Información adicional. |
| Activo | Indica si el ítem está disponible para uso. |

### Ejemplo completo

| Campo | Ejemplo |
| --- | --- |
| Ítem | Alitas de pollo |
| Categoría | Carnes |
| Subcategoría | Pollo |
| Unidad | kg |
| Stock actual | 20 kg |
| Stock mínimo | 5 kg |
| Punto de reorden | 8 kg |
| Ubicación | Freezer |
| Maneja vencimiento | Sí |
| Maneja lotes | Sí |
| Usa FIFO | Sí |

### Editar un ítem

1. Ve a la pestaña **Ítems**.
2. Busca el ítem.
3. Abre la acción de edición.
4. Modifica los campos.
5. Guarda.

### Desactivar o eliminar un ítem

Un usuario admin puede desactivar ítems. Esto conserva el historial.

Un usuario super_admin puede realizar eliminación completa desde la interfaz cuando corresponde. Esta acción debe usarse con cuidado porque puede afectar el historial.

## 9. Entradas de inventario

Una entrada aumenta el stock de un ítem.

Se usa cuando:

- Llega mercadería nueva.
- Se registra una compra.
- Se corrige stock faltante.
- Se devuelve mercadería al inventario.

### Ejemplo

Compra de 20 kg de alitas de pollo.

### Cómo registrar una entrada

1. Entra a **Inventario**.
2. Haz clic en **Registrar entrada**.
3. Selecciona el ítem.
4. Selecciona el tipo de movimiento, por ejemplo **entrada** o **compra**.
5. Ingresa la cantidad.
6. Selecciona la unidad del ítem.
7. Ingresa costo unitario si corresponde.
8. Selecciona proveedor si corresponde.
9. Ingresa lote si el ítem maneja lotes.
10. Ingresa fecha de compra y vencimiento si corresponde.
11. Selecciona ubicación destino.
12. Agrega notas si es necesario.
13. Guarda.

### Qué pasa al guardar

Cuando registras una entrada:

- Aumenta el stock actual del ítem.
- Se crea un movimiento en el historial.
- Se crea o actualiza un lote si el ítem maneja lotes.
- Puede actualizarse el costo promedio del ítem.

## 10. Salidas de inventario

Una salida disminuye el stock.

Se usa cuando:

- Se usa producto en cocina.
- Se retira inventario para uso interno.
- Se corrige un exceso de stock.
- Se descuenta producto por consumo manual.

### Ejemplo

Se usaron 3 kg de alitas en cocina.

### Cómo registrar una salida

1. Entra a **Inventario**.
2. Abre la opción de registrar movimiento.
3. Selecciona el ítem.
4. Elige tipo de movimiento **salida** o **uso interno**.
5. Ingresa la cantidad.
6. Selecciona lote si corresponde.
7. Agrega motivo o notas.
8. Guarda.

### Validaciones importantes

El sistema no permite registrar una salida mayor al stock disponible.

Si seleccionas un lote, tampoco permite sacar una cantidad mayor a la disponible en ese lote.

## 11. Mermas o pérdidas

Una merma es una pérdida de inventario.

Ejemplos:

- Producto vencido.
- Producto dañado.
- Derrame.
- Error de preparación.
- Pérdida.
- Consumo interno.

### Cómo registrar una merma

1. Entra a **Inventario**.
2. Haz clic en **Registrar merma**.
3. Selecciona el ítem.
4. Ingresa cantidad.
5. Selecciona lote si corresponde.
6. Escribe el motivo.
7. Agrega notas.
8. Guarda.

### Qué pasa al guardar

Cuando registras una merma:

- Disminuye el stock.
- Se registra un movimiento tipo merma.
- Queda disponible para reportes.
- Si había lote seleccionado, disminuye la cantidad disponible del lote.

## 12. Lotes

Un lote es un grupo de inventario comprado o recibido en una fecha determinada.

Sirve para controlar:

- Fecha de compra.
- Fecha de vencimiento.
- Proveedor.
- Cantidad inicial.
- Cantidad disponible.
- Costo.
- Ubicación.

### Cuándo usar lotes

Usa lotes para productos perecederos o compras importantes.

Ejemplos:

- Leche con vencimiento.
- Alitas congeladas.
- Queso.
- Harina por bolsa.
- Salsas.
- Frutas.

### Cómo crear un lote

Actualmente no existe un botón independiente solo para crear lotes. El lote se crea desde una entrada cuando el ítem tiene activada la opción **Maneja lotes**.

Flujo recomendado:

1. Crea o edita el ítem.
2. Activa **Maneja lotes**.
3. Registra una entrada.
4. Ingresa código de lote.
5. Ingresa fecha de compra.
6. Ingresa fecha de vencimiento si corresponde.
7. Guarda.

### Estados de lote

| Estado | Significado |
| --- | --- |
| Activo | Tiene cantidad disponible. |
| Vencido | La fecha de vencimiento ya pasó. |
| Agotado | Ya no tiene cantidad disponible. |

### Cómo ver lotes

1. Entra a **Inventario**.
2. Abre la pestaña **Lotes**.
3. Revisa el listado.
4. También puedes abrir el detalle de un ítem para ver sus lotes relacionados.

## 13. Fechas de vencimiento

Las fechas de vencimiento se registran en los lotes.

### Cómo registrar vencimiento

1. El ítem debe tener activada la opción **Maneja vencimiento**.
2. Registra una entrada con lote.
3. Completa el campo fecha de vencimiento.
4. Guarda.

### Alertas de vencimiento

El sistema genera alertas para:

- Lotes vencidos.
- Lotes próximos a vencer.

Actualmente, se considera próximo a vencer cuando el lote vence dentro de los siguientes 7 días.

### Qué pasa si un lote venció

El sistema lo muestra en alertas y reportes. La versión actual no descuenta automáticamente el stock vencido. Si deseas retirarlo del inventario, registra una merma o movimiento de vencimiento.

### Recomendaciones

- Registra vencimiento en carnes, lácteos, salsas, frutas, verduras y productos preparados.
- Revisa las alertas todos los días.
- Aplica FIFO: usa primero los lotes más antiguos.
- Registra mermas cuando un producto ya no pueda usarse.

## 14. Movimientos / Kardex

El kardex es el historial de movimientos de inventario.

Cada entrada, salida, ajuste, merma o transferencia queda registrada.

### Tipos de movimiento disponibles

| Tipo | Efecto general |
| --- | --- |
| Entrada | Aumenta stock. |
| Compra | Aumenta stock. |
| Devolución | Aumenta stock. |
| Ajuste positivo | Aumenta stock. |
| Salida | Disminuye stock. |
| Uso interno | Disminuye stock. |
| Merma | Disminuye stock. |
| Vencimiento | Disminuye stock. |
| Ajuste negativo | Disminuye stock. |
| Corrección | Puede usarse para correcciones según el caso. |
| Transferencia | Registra traslado entre ubicaciones. |

### Cómo ver movimientos

1. Entra a **Inventario**.
2. Abre la pestaña **Movimientos**.
3. Revisa fecha, ítem, tipo, cantidad, motivo y usuario.
4. También puedes abrir el detalle de un ítem para ver movimientos recientes de ese ítem.

### Cómo interpretar el kardex

Cada movimiento indica:

- Qué ítem fue afectado.
- Cuánta cantidad se movió.
- Qué tipo de operación fue.
- Si hubo lote.
- Si hubo ubicación origen o destino.
- Quién lo registró.
- Cuándo ocurrió.
- Notas o motivo.

## 15. Conteos de inventario

Un conteo sirve para comparar el stock registrado contra el stock físico real.

### Tipos de conteo

- Diario.
- Semanal.
- Mensual.
- Trimestral.
- Anual.
- Personalizado.

### Cómo crear un conteo

1. Entra a **Inventario**.
2. Abre la pestaña **Conteos**.
3. Crea un nuevo conteo.
4. Selecciona tipo de conteo.
5. Selecciona categoría, ubicación o todos los ítems.
6. Guarda.

Al crear el conteo, el sistema toma el stock esperado de los ítems activos que coinciden con el filtro.

### Cómo ingresar stock contado

1. Abre el conteo creado.
2. Ingresa la cantidad física encontrada.
3. Agrega notas si hace falta.
4. Guarda.

### Diferencias

El sistema calcula la diferencia:

| Dato | Ejemplo |
| --- | --- |
| Stock esperado | 10 kg |
| Stock contado | 8 kg |
| Diferencia | -2 kg |

### Completar conteo

Puedes completar el conteo sin ajustes o completarlo generando ajustes automáticos, si la interfaz muestra esa opción.

Cuando se generan ajustes, el sistema registra movimientos de corrección para reflejar la diferencia.

## 16. Alertas

La pestaña **Alertas** muestra situaciones que necesitan revisión.

### Alertas disponibles

| Alerta | Significado | Cómo resolver |
| --- | --- | --- |
| Stock bajo | Stock actual menor o igual al mínimo. | Registrar entrada o planificar compra. |
| Sin stock | Stock actual igual o menor a cero. | Registrar entrada o desactivar si ya no se usa. |
| Punto de reorden | Stock llegó al nivel configurado para volver a comprar. | Contactar proveedor o registrar compra. |
| Exceso de stock | Stock supera el máximo configurado. | Revisar compras o consumo. |
| Próximo a vencer | Lote vence dentro de los siguientes 7 días. | Usar primero, promocionar o registrar merma si ya no sirve. |
| Vencido | Lote con fecha vencida. | Revisar físicamente y registrar merma o vencimiento. |
| Sin costo | Ítem sin costo unitario. | Editar ítem y agregar costo. |
| Sin categoría | Ítem sin categoría asociada. | Editar ítem y asignar categoría. |
| Inactivo | Ítem desactivado. | Activar si se volverá a usar. |

## 17. Reportes

La pestaña **Reportes** permite consultar información del inventario.

### Reportes disponibles actualmente

| Reporte | Para qué sirve |
| --- | --- |
| Stock actual | Ver existencias actuales y valor estimado. |
| Movimientos | Revisar entradas, salidas, ajustes y mermas por fecha. |
| Mermas y vencimientos | Analizar pérdidas y productos vencidos. |
| Lotes y vencimientos | Revisar lotes activos, próximos a vencer y vencidos. |

### Filtros disponibles

Los reportes pueden filtrarse por:

- Fecha inicio.
- Fecha fin.
- Categoría.
- Ubicación.
- Ítem.
- Tipo de movimiento.

### Valor total del inventario

El valor estimado se calcula usando:

```text
stock actual x costo unitario
```

Este valor es una referencia administrativa. Puede variar si hay costos diferentes por lote o compras con precios distintos.

## 18. Exportación de datos

El módulo permite exportar información a:

- CSV.
- PDF.

### Exportar CSV

1. Entra a Inventario.
2. Usa el botón **CSV** o exporta desde reportes.
3. El archivo contiene datos en formato de tabla.

El CSV sirve para abrir la información en Excel, Google Sheets u otro programa de hojas de cálculo.

### Exportar PDF

1. Entra a **Reportes**.
2. Elige el reporte.
3. Aplica filtros si corresponde.
4. Haz clic en exportar PDF.

El PDF incluye título del reporte, fecha de generación, filtros aplicados y tabla de datos.

### Excel

La exportación directa a Excel todavía no está implementada. Como alternativa, exporta CSV y ábrelo con Excel.

## 19. Permisos de usuario

### Admin

Un usuario admin puede:

- Entrar al módulo de inventario.
- Crear y editar categorías.
- Crear y editar unidades.
- Crear y editar ubicaciones.
- Crear y editar proveedores.
- Crear y editar ítems.
- Registrar movimientos.
- Registrar entradas.
- Registrar salidas.
- Registrar mermas.
- Crear y completar conteos.
- Ver alertas.
- Ver reportes.
- Exportar CSV y PDF.
- Desactivar ítems.

### Super admin

Un usuario super_admin puede hacer lo mismo que admin y además:

- Eliminar ítems completamente desde la interfaz cuando corresponda.
- Realizar acciones destructivas con mayor alcance.

### Usuario normal

Un usuario normal no debe poder:

- Entrar al módulo.
- Crear inventario.
- Editar inventario.
- Registrar movimientos.
- Ver reportes internos.

## 20. Validaciones importantes

El sistema valida reglas básicas para evitar errores:

- El nombre del ítem es obligatorio.
- La categoría es obligatoria.
- La unidad es obligatoria.
- El stock no puede ser negativo.
- El costo no puede ser negativo.
- El stock mínimo no puede ser negativo.
- La cantidad de movimiento debe ser mayor a cero.
- No se permite salida mayor al stock disponible.
- No se permite salida mayor al stock disponible de un lote.
- No se puede eliminar una categoría con ítems o subcategorías asociadas.
- No se debe eliminar una unidad usada por ítems.

## 21. Buenas prácticas

- Registra entradas apenas llegue mercadería.
- Usa lotes para productos perecederos.
- Revisa alertas todos los días.
- Haz conteos semanales o mensuales.
- No borres ítems usados; es mejor desactivarlos.
- Registra mermas para controlar pérdidas reales.
- Mantén unidades claras y consistentes.
- Evita crear dos unidades para lo mismo, por ejemplo kg y kilo, si no es necesario.
- Usa categorías simples para que el equipo encuentre rápido los insumos.
- Completa costos unitarios para obtener reportes de valor más útiles.
- Usa notas cuando hagas correcciones o ajustes.

## 22. Errores comunes y soluciones

| Problema | Causa posible | Solución |
| --- | --- | --- |
| No puedo entrar a Inventario. | El usuario no tiene rol admin o super_admin. | Iniciar sesión con una cuenta autorizada. |
| No puedo registrar una salida. | No hay stock suficiente. | Verificar stock o registrar una entrada primero. |
| No puedo descontar de un lote. | El lote no tiene cantidad suficiente. | Seleccionar otro lote o revisar entrada del lote. |
| No aparece un ítem. | Está inactivo o hay filtros aplicados. | Revisar filtros y estado del ítem. |
| No puedo eliminar una categoría. | Tiene subcategorías o ítems asociados. | Mover o desactivar los ítems primero. |
| No aparece una alerta de vencimiento. | El ítem no maneja vencimiento o el lote no tiene fecha. | Editar ítem y lote para completar vencimiento. |
| El valor de inventario sale en cero. | El ítem no tiene costo unitario. | Editar ítem y agregar costo. |
| La transferencia no cambia stock por ubicación. | La versión actual registra transferencia, pero no maneja saldos separados por ubicación. | Usar transferencia como historial y esperar la fase de stock por ubicación. |
| No puedo exportar Excel. | Excel directo no está implementado. | Exportar CSV y abrirlo en Excel. |
| El lote vencido sigue en stock. | El vencimiento no descuenta automáticamente. | Registrar merma o movimiento de vencimiento. |

## 23. Glosario

| Término | Significado |
| --- | --- |
| Ítem | Elemento inventariable, como harina, leche, alitas o vasos. |
| SKU | Código interno para identificar un ítem. |
| Stock | Cantidad disponible de un ítem. |
| Stock mínimo | Cantidad mínima recomendada antes de reponer. |
| Stock máximo | Cantidad máxima recomendada para no sobrecomprar. |
| Punto de reorden | Nivel en el que conviene volver a comprar. |
| Unidad de medida | Forma en que se mide el ítem, como kg, litro o unidad. |
| Categoría | Grupo principal para organizar ítems. |
| Subcategoría | División interna de una categoría. |
| Ubicación | Lugar físico donde está el inventario. |
| Proveedor | Persona o empresa que entrega insumos. |
| Lote | Grupo de inventario recibido en una fecha específica. |
| Vencimiento | Fecha límite recomendada para usar un lote. |
| Merma | Pérdida de inventario por daño, vencimiento, error o consumo interno. |
| Kardex | Historial de movimientos de un ítem. |
| Conteo | Revisión física del stock para compararlo con el sistema. |
| FIFO | Método que recomienda usar primero lo más antiguo. |

## 24. Flujo recomendado diario

1. Entrar al panel administrador.
2. Abrir **Inventario**.
3. Revisar tarjetas de resumen.
4. Revisar la pestaña **Alertas**.
5. Registrar entradas nuevas.
6. Registrar salidas, mermas o vencimientos.
7. Revisar productos próximos a vencer.
8. Confirmar que los ítems críticos tengan stock suficiente.
9. Cerrar el día con una revisión rápida de movimientos.

## 25. Flujo recomendado mensual

1. Crear conteo mensual.
2. Revisar el stock físico.
3. Ingresar cantidades contadas.
4. Revisar diferencias.
5. Completar conteo.
6. Generar ajustes si corresponde.
7. Exportar reporte mensual.
8. Revisar mermas.
9. Revisar productos vencidos.
10. Planificar compras del siguiente mes.

## 26. Funciones futuras o pendientes de implementación

Estas funciones están preparadas o pensadas para fases futuras, pero no deben considerarse disponibles completamente en la versión actual:

| Función | Estado actual |
| --- | --- |
| Descuento automático por pedidos vendidos | Pendiente. Inventario todavía es independiente de productos y pedidos. |
| Recetas por producto | Pendiente. No existe pantalla de recetas ni ingredientes por producto. |
| Costeo automático por receta | Pendiente. |
| Conversión visual de unidades | La base de datos está preparada, pero falta interfaz completa. |
| Stock detallado por ubicación | Parcial. Hay ubicaciones en ítems y lotes, pero no saldo separado por ubicación. |
| Transferencias con saldo por ubicación | Parcial. Se registra movimiento, pero no se calcula stock independiente por ubicación. |
| Carga real de imagen del ítem a Storage | Pendiente. Actualmente existe campo de ruta o URL. |
| Exportación directa a Excel | Pendiente. Usar CSV como alternativa. |
| Reportes avanzados de kardex por ítem con filtros completos | Parcial. Hay movimientos y detalle de ítem, pero puede ampliarse. |
| Auditoría completa de todas las acciones CRUD | Parcial. Movimientos y conteos registran acciones; algunas ediciones directas pueden ampliarse. |
| Limpieza masiva de históricos | Reservado para super_admin en una fase futura. |

## 27. Guía rápida de Inventario

### Cómo agregar un ítem

1. Entra a **Inventario**.
2. Haz clic en **Nuevo ítem**.
3. Completa nombre, categoría y unidad.
4. Agrega stock mínimo, costo y ubicación.
5. Activa lotes o vencimiento si aplica.
6. Guarda.

### Cómo registrar una entrada

1. Haz clic en **Registrar entrada**.
2. Selecciona el ítem.
3. Ingresa cantidad y costo.
4. Agrega proveedor, lote y vencimiento si corresponde.
5. Guarda.

Resultado: el stock aumenta y queda un movimiento registrado.

### Cómo registrar una salida

1. Abre registrar movimiento.
2. Selecciona el ítem.
3. Elige tipo **salida** o **uso interno**.
4. Ingresa cantidad.
5. Guarda.

Resultado: el stock disminuye y queda historial.

### Cómo registrar una merma

1. Haz clic en **Registrar merma**.
2. Selecciona el ítem.
3. Ingresa cantidad.
4. Escribe motivo.
5. Guarda.

Resultado: el stock disminuye y la pérdida aparece en movimientos y reportes.

### Cómo ver reportes

1. Entra a **Inventario**.
2. Abre la pestaña **Reportes**.
3. Elige el tipo de reporte.
4. Aplica filtros si corresponde.
5. Revisa la tabla.

### Cómo exportar PDF

1. Entra a **Reportes**.
2. Selecciona reporte y filtros.
3. Haz clic en exportar PDF.
4. Guarda o comparte el archivo generado.

### Cómo exportar CSV

1. Usa el botón **CSV** desde Inventario o Reportes.
2. Abre el archivo con Excel, Google Sheets u otra herramienta.

