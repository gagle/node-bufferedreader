binary-reader
============

_Node.js project_

#### Random access buffered binary reader ####

Version: 2.0.0

The reader allows you to position a cursor and read the bytes you need. It has an internal buffer so if the cursor is positioned inside its limits, the data is already into memory, so no i/o operations are required, therefore the overall performance is better.

#### Installation ####

```
npm install binary-reader
```

#### Functions ####

- [_module_.open(file[, options]) : undefined](#open)

---

<a name="open"></a>
___module_.open(file[, options]) : undefined__  

