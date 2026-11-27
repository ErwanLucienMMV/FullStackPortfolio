# MiniRT: UML

Reviewed source: [54c7bf80b296](https://github.com/ErwanLucienMMV/minirt/tree/54c7bf80b2962b5a112cdda1b8997889cfe21d15).

UML of actual C scene and renderer structs. Shape variants are members of a tagged union, not subclasses. A scene has one camera, one ambient descriptor, one light and a linked object list in the reviewed code. t_render_job exists only in the MINIRT_BONUS build and refers to shared graphics state; it does not own another scene. Ray-intersection math, GUI types and vector primitives are omitted for readability.

[Open SVG](../../../backend/src/content/diagrams/minirt.svg).
Portfolio: `/fr/projets?project=minirt` and `/en/projects?project=minirt`.
API: `/api/diagrams/minirt.svg`.

```mermaid
classDiagram
 direction TB
 class t_gfx {
 <<struct>>
 +mlx : void*
 +mlx_win : void*
 +max_bounces : uint16_t
 +threads : uint8_t
 }
 class t_scene {
 <<struct>>
 +object_count : int
 }
 class t_camera {
 <<struct>>
 +position : t_float3
 +orientation : t_float3
 +fov : uint8_t
 }
 class t_ambient {
 <<struct>>
 +ratio : float
 +color : t_int3
 }
 class t_light {
 <<struct>>
 +position : t_float3
 +brightness : float
 }
 class t_object {
 <<struct>>
 +type : t_obj_type
 +next : t_object*
 }
 class t_object_data {
 <<union>>
 }
 class t_sphere {
 <<struct>>
 +diameter : float
 }
 class t_plane {
 <<struct>>
 +normal : t_float3
 }
 class t_cylinder {
 <<struct>>
 +diameter : float
 +height : float
 }
 class t_render_job {
 <<bonus_struct>>
 +y_start : int
 +y_end : int
 }
 t_gfx *-- t_scene : scene
 t_scene *-- t_camera : camera
 t_scene *-- t_ambient : ambient
 t_scene *-- t_light : light
 t_scene "1" *-- "0..*" t_object : objects linked list
 t_object *-- t_object_data : data
 t_object_data ..> t_sphere : sphere variant
 t_object_data ..> t_plane : plane variant
 t_object_data ..> t_cylinder : cylinder variant
 t_render_job --> t_gfx : shared gfx pointer
```

Inspected implementation files:

- [include/scene.h](https://github.com/ErwanLucienMMV/minirt/blob/54c7bf80b2962b5a112cdda1b8997889cfe21d15/include/scene.h)
- [include/object.h](https://github.com/ErwanLucienMMV/minirt/blob/54c7bf80b2962b5a112cdda1b8997889cfe21d15/include/object.h)
- [include/gfx.h](https://github.com/ErwanLucienMMV/minirt/blob/54c7bf80b2962b5a112cdda1b8997889cfe21d15/include/gfx.h)
- [include/ray.h](https://github.com/ErwanLucienMMV/minirt/blob/54c7bf80b2962b5a112cdda1b8997889cfe21d15/include/ray.h)
- [include/render.h](https://github.com/ErwanLucienMMV/minirt/blob/54c7bf80b2962b5a112cdda1b8997889cfe21d15/include/render.h)
- [src/main.c](https://github.com/ErwanLucienMMV/minirt/blob/54c7bf80b2962b5a112cdda1b8997889cfe21d15/src/main.c)
- [src/render/rnd_loop_bonus.c](https://github.com/ErwanLucienMMV/minirt/blob/54c7bf80b2962b5a112cdda1b8997889cfe21d15/src/render/rnd_loop_bonus.c)
