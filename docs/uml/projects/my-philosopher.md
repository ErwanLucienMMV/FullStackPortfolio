# my_philosopher: UML

Reviewed source: [e00951bc9be6](https://github.com/ErwanLucienMMV/my_philosopher/tree/e00951bc9be6bf49f40381de54d24b3c67168ce3).

Structural UML of C structs, not C++ classes. t_table owns the configuration value, allocated philosophers and fork mutex arrays. Each philosopher refers back to the same table and points at neighboring entries in the shared fork array; its meal_mutex is separate. Thread entry points are explicitly marked as functions. This documents the implementation and does not claim that its synchronization has been formally proved race-free.

[Open SVG](../../../backend/src/content/diagrams/my-philosopher.svg).
Portfolio: `/fr/projets?project=my-philosopher` and `/en/projects?project=my-philosopher`.
API: `/api/diagrams/my-philosopher.svg`.

```mermaid
classDiagram
 direction TB
 class t_args {
 <<struct>>
 +number_of_philo : int
 +time_to_die : long
 +time_to_eat : long
 +time_to_sleep : long
 +number_of_times_eat : int
 }
 class t_table {
 <<struct>>
 +start_time : long
 +forks : pthread_mutex_t*
 +print_mutex : pthread_mutex_t
 +stop_mutex : pthread_mutex_t
 +stop_simulation : int
 +monitor : pthread_t
 }
 class t_philo {
 <<struct>>
 +id : int
 +thread : pthread_t
 +last_meal : long
 +meals_eaten : int
 +meal_mutex : pthread_mutex_t
 +left_fork : pthread_mutex_t*
 +right_fork : pthread_mutex_t*
 }
 class philo_routine {
 <<function>>
 }
 class monitor_routine {
 <<function>>
 }
 t_table "1" *-- "1" t_args : args
 t_table "1" *-- "1..*" t_philo : philos array
 t_philo --> t_table : table pointer
 philo_routine ..> t_philo : thread argument
 monitor_routine ..> t_table : monitors meal and stop state
```

Inspected implementation files:

- [philo.h](https://github.com/ErwanLucienMMV/my_philosopher/blob/e00951bc9be6bf49f40381de54d24b3c67168ce3/philo.h)
- [src/init.c](https://github.com/ErwanLucienMMV/my_philosopher/blob/e00951bc9be6bf49f40381de54d24b3c67168ce3/src/init.c)
- [src/simulation_helpers.c](https://github.com/ErwanLucienMMV/my_philosopher/blob/e00951bc9be6bf49f40381de54d24b3c67168ce3/src/simulation_helpers.c)
- [src/simulation_functions.c](https://github.com/ErwanLucienMMV/my_philosopher/blob/e00951bc9be6bf49f40381de54d24b3c67168ce3/src/simulation_functions.c)
- [src/thread_ripper.c](https://github.com/ErwanLucienMMV/my_philosopher/blob/e00951bc9be6bf49f40381de54d24b3c67168ce3/src/thread_ripper.c)
