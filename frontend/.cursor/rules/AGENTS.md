# Project Instructions

## Code style

- Prefer to create new function as named function instead of definition as const.
- New not exported functions from file place after exported stuff. Exported functions should go first.
- Tailwind classed should be ordered: 
    - position classes: margin, padding, size, font size
    - color classes
    - then the rest
    - at the end place classes that has effect for children such as flex and grid
 - when import typescript types use { type Name } instead of type { Name }
 - in import statement place types at start of imported members i.e. { type Name, functionName, and so on... }
 - Prefer to use typescript types instead of interfaces

