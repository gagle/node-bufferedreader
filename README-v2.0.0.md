binary-reader
============

_Node.js project_

#### Random access buffered binary reader ####

Version: 0.0.1

The reader allows you to position a cursor and read the bytes you need. It has an internal buffer so if the cursor is positioned inside the limits of the current buffer, the data is already into memory, so no I/O operation is required, therefore the overall performance is better.

#### Installation ####

```
npm install binary-reader
```

#### Functions ####

- [_module_.open(file[, options]) : undefined](#open)

---

<a name="open"></a>
___module_.open(file[, options]) : undefined__  

