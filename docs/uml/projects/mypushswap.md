# mypushswap: UML

Reviewed source: [375f3f905e77](https://github.com/ErwanLucienMMV/mypushswap/tree/375f3f905e772faa25a7358eb89d249c61e7c25d).

UML sequence of the implemented C sorting functions. Lifelines name functions, not classes. Stacks A and B are linked t_stack nodes containing num, index and next. turk_sort skips already sorted inputs, uses small_sort for fewer than six nodes, and otherwise transfers chosen nodes to B before sorting/reinserting. Operation wrappers emit the restricted push/swap/rotation instruction stream. This is a structural code review, not a proof of optimal instruction count.

[Open SVG](../../../backend/src/content/diagrams/mypushswap.svg).
Portfolio: `/fr/projets?project=mypushswap` and `/en/projects?project=mypushswap`.
API: `/api/diagrams/mypushswap.svg`.

```mermaid
sequenceDiagram
 actor CLI
 participant Main as main / argument parsing
 participant Sort as push_swap / turk_sort
 participant Cost as get_optimal_node_index / get_cost
 participant Move as resolve_to_b
 participant Small as small_sort / resolve_to_a
 CLI->>Main: Integer arguments
 Main->>Main: safe_atoi and tab_to_t_stack
 Main->>Sort: push_swap(A)
 Sort->>Sort: index_stacks and is_sorted
 alt Already sorted
 Sort-->>Main: No sorting operations
 else Fewer than six nodes
 Sort->>Small: small_sort(A, B)
 Small-->>Sort: Sorted A
 else Larger input
 Sort->>Sort: find_median and push_best_two
 loop While A contains more than five nodes
 Sort->>Cost: Evaluate candidate movement costs
 Cost-->>Sort: Selected node index
 Sort->>Move: resolve_to_b(A, B, index)
 Move-->>Sort: Rotate and push node to B
 Sort->>Sort: Reindex stacks
 end
 Sort->>Small: small_sort(A, B)
 Small->>Small: Sort core, reinsert B, align A
 Small-->>Sort: Sorted A and empty B
 end
 Sort-->>Main: Return and free original allocation
 Note over Sort,Small: Stack operations print the instruction stream
```

Inspected implementation files:

- [push_swap.h](https://github.com/ErwanLucienMMV/mypushswap/blob/375f3f905e772faa25a7358eb89d249c61e7c25d/push_swap.h)
- [main.c](https://github.com/ErwanLucienMMV/mypushswap/blob/375f3f905e772faa25a7358eb89d249c61e7c25d/main.c)
- [push_swap.c](https://github.com/ErwanLucienMMV/mypushswap/blob/375f3f905e772faa25a7358eb89d249c61e7c25d/push_swap.c)
- [turk_sort.c](https://github.com/ErwanLucienMMV/mypushswap/blob/375f3f905e772faa25a7358eb89d249c61e7c25d/turk_sort.c)
- [get_cost.c](https://github.com/ErwanLucienMMV/mypushswap/blob/375f3f905e772faa25a7358eb89d249c61e7c25d/get_cost.c)
- [resolve_to.c](https://github.com/ErwanLucienMMV/mypushswap/blob/375f3f905e772faa25a7358eb89d249c61e7c25d/resolve_to.c)
- [resolve_helper.c](https://github.com/ErwanLucienMMV/mypushswap/blob/375f3f905e772faa25a7358eb89d249c61e7c25d/resolve_helper.c)
- [turk_sort_helpers.c](https://github.com/ErwanLucienMMV/mypushswap/blob/375f3f905e772faa25a7358eb89d249c61e7c25d/turk_sort_helpers.c)
