# DrQuinn: UML

Reviewed source: [0fe8a81a65dc](https://github.com/ErwanLucienMMV/DrQuinn/tree/0fe8a81a65dc6a1411c31d131457bb51b3e87131).

UML sequence of the C implementations of Colleen, Grace and Sully. These are independent programs, not a class hierarchy. They expand encoded source text rather than reading their source files. Sully's original counter is five; generated programs decrement it and stop before writing a negative generation. Assembly and Python variants are also present; the diagram shows the C compiler path, not the Python bytecode or NASM paths. No cloned program was executed during this review.

[Open SVG](../../../backend/src/content/diagrams/dr-quinn.svg).
Portfolio: `/fr/projets?project=dr-quinn` and `/en/projects?project=dr-quinn`.
API: `/api/diagrams/dr-quinn.svg`.

```mermaid
sequenceDiagram
 actor Runner
 participant Program as Selected C program
 participant Output as Standard output
 participant Files as Generated source files
 participant Compiler as Shell / cc
 participant Child as Generated Sully executable
 Runner->>Program: Run Colleen, Grace or Sully
 alt Colleen
 Program->>Output: printf encoded source and flush
 else Grace
 Program->>Files: fopen Grace_kid.c
 Program->>Files: WRITE encoded source, then fclose
 else Sully
 Program->>Program: ft_counter from embedded value and filename
 alt Counter is nonnegative
 Program->>Files: ft_write_source Sully_i.c
 Program->>Compiler: Compile Sully_i.c and run only on success
 Compiler->>Child: Execute Sully_i
 Child->>Child: Decrement counter and repeat generation
 Note over Child: Stop before creating a negative generation
 else Counter is negative
 Program-->>Runner: Exit without generation
 end
 end
```

Inspected implementation files:

- [C/Colleen.c](https://github.com/ErwanLucienMMV/DrQuinn/blob/0fe8a81a65dc6a1411c31d131457bb51b3e87131/C/Colleen.c)
- [C/Grace.c](https://github.com/ErwanLucienMMV/DrQuinn/blob/0fe8a81a65dc6a1411c31d131457bb51b3e87131/C/Grace.c)
- [C/Sully.c](https://github.com/ErwanLucienMMV/DrQuinn/blob/0fe8a81a65dc6a1411c31d131457bb51b3e87131/C/Sully.c)
- [C/Makefile](https://github.com/ErwanLucienMMV/DrQuinn/blob/0fe8a81a65dc6a1411c31d131457bb51b3e87131/C/Makefile)
- [ASM/Sully.s](https://github.com/ErwanLucienMMV/DrQuinn/blob/0fe8a81a65dc6a1411c31d131457bb51b3e87131/ASM/Sully.s)
- [Python/Sully.py](https://github.com/ErwanLucienMMV/DrQuinn/blob/0fe8a81a65dc6a1411c31d131457bb51b3e87131/Python/Sully.py)
