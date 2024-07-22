---
title: Trying Protocol Buffers with C++
author: shuji-morimoto
date: 2024-03-08T00:00:00.000Z
tags:
  - ロボット
  - C++
image: true
translate: true

---

:::alert
This article has been automatically translated.
The original article is [here](https://developer.mamezou-tech.com/blogs/2024/03/08/protocol-buffers-cpp/).
:::



In applications, there is often a need to send and receive data between processes or to save and restore data to and from file systems or databases. For this purpose, there are many libraries available for converting objects to JSON or XML, but Protocol Buffers is also an option.

This article introduces some tips and tricks based on notes from a previous experience using Protocol Buffers with C++. It assumes a certain level of knowledge about Protocol Buffers and memory management in C++.

## Background of Using Protocol Buffers in C++
I developed a desktop application for product design using C++. The design data is saved and read from local files. The following requirements and requests were made:

- Want to keep schema definitions as data when persisting
- Need to handle data of several megabytes
- Want to reduce the data size when persisting
- Serialization and deserialization should be fast
- Want to serialize and deserialize the data structure held in the app as is
- Persistent data can be binary
- Want to maintain backward compatibility
- Don't want to spend too much development effort on saving and loading data

XML can end up having more data volume in tags and attribute names than the actual data, and parsing can be relatively slow. Also, handling JSON in C++ requires dealing with data structures like key-value pairs (maps), which requires careful management of key names and data types.

Using Protocol Buffers satisfies the above requirements, allows the use of pre-compiled data types, and enables direct serialization.

"Schema definition by proto files" == "C++ class definition (*.h and *.cc generation)" means that the serialized data corresponds one-to-one with the source code, ensuring that the data is verified.

## Protocol Buffers Definition File (.proto) Format & Style

Referenced from [Language Guide (proto 3)](https://developers.google.com/protocol-buffers/docs/proto3)

### Available Data Types

All scalar data types are available.

double, float, int32, int64, uint32, uint64, sint64, fixed32, fixed64, sfixed32, sfixed64, bool, string, bytes

Timestamp types and structured (JSON-like) types are also available in the library and can be used by importing them.

### Rules for Maintaining Backward Compatibility

Each field in a message is identified by a field number.
- Field names can be changed
- Fields can be deleted (the field number is permanently retired)
    - reserved field number n, field number m, field number x to field number y;
    - reserved "field name1", "field name2";
- Changing the type of a field is not allowed
- Changing the field number of a field is not allowed
- Adding fields is possible (assign a new field number)
- Field numbers start from 1 for message fields
    - However, 19000-19999 are reserved and cannot be used

### Rules for Defining enum Types
- Values are in uppercase SNAKE_CASE
    - Example: HELLO_WORLD
- Values start from 0
    - 0 represents unspecified
- **Different enum types cannot define the same value**
    - The following would result in duplicate errors
    ```protobuf
    enum Foo {
      UNSPECIFIED = 0;
      A = 1;
      VALUE_FOO = 2;
    }

    enum Bar {
      UNSPECIFIED = 0;
      A = 1;
      VALUE_BAR = 2;
    }
    ```

    - Revised version 1: Always prefix values to avoid duplicates
    ```protobuf
    enum Foo {
      FOO_UNSPECIFIED = 0;
      FOO_A = 1;
      FOO_VALUE_FOO = 2;
    }

    enum Bar {
      BAR_UNSPECIFIED = 0;
      BAR_A = 1;
      BAR_VALUE_BAR = 2;
    }
    ```

    - Revised version 2: Define enums within a message
    ```protobuf
    message Foo {
      enum Enum {
        UNSPECIFIED = 0;
        A = 1;
      }
    }

    message Bar {
      enum Enum {
        UNSPECIFIED = 0;
        A = 1;
      }
    }

    // Message definition using enums
    message Xyz {
      enum Foo.Enum foo = 1;
      enum Bar.Enum bar = 2;
    }
    ```

### Style Guide for proto Files
- Indentation is 2 spaces
- File names are in lowercase snake_case
- Message names are in CamelCase
- Fields are in snake_case
- Names of arrays with 'repeated' are pluralized
- Enum names are in CamelCase, enum value names use uppercase and underscores
- The first value of an enum is better set to id=0 and UNSPECIFIED (unspecified)
- When defining RPC services, both the service name and the function names are in CamelCase

### Importing Data Types
Split .proto files by package or message, and if you want to use messages defined in other .proto files, use import. Predefined messages can also be used. The following import "google/..." refers to proto files in the include folder.
```protobuf
syntax = "proto3";
// To use structured data types (JSON-like types)
import "google/protobuf/struct.proto";

message MyObject {
  int32  no                   = 1;
  string name                 = 2;
  google.protobuf.Struct json = 3;
}
```

- The `--proto_path` parameter for protoc allows you to specify any number of folders containing .proto files
- The C++ API is defined in include/google/protobuf/struct.pb.h
- You can use the Struct type directly in your C++ code

### Specifying Options
Options are interpreted in specific contexts.
[List of options](https://github.com/protocolbuffers/protobuf/blob/master/src/google/protobuf/descriptor.proto)

Specify optimization-related options with `optimize_for`.
```protobuf
// If you want to use a lightweight runtime
option optimize_for = LITE_RUNTIME;
```
:::alert
Optimizing for LITE_RUNTIME reduces the library size, but you will not be able to use functions like google::protobuf::util::MessageToJsonString() that serialize messages to JSON strings.
:::

Use `cc_enable_arenas` to utilize protobuf's memory allocation buffers.
- Optimizes and speeds up memory management called Arena
- Messages are constructed on the Arena and not deleted
- The lifecycle of the Arena area is synchronized with the lifecycle of the message object

```protobuf
option cc_enable_arenas = true;
```


## Protocol Buffers C++ API
In environments like Python and Java, where memory safety mechanisms are provided at runtime, you don't have to worry too much about the lifecycle of objects. However, in C++, developers need to manage it themselves. Therefore, the Protocol Buffers C++ API is designed with memory safety and efficiency in mind (reducing the burden on developers).

[C++ Tutorial](https://developers.google.com/protocol-buffers/docs/cpptutorial)

[C++ API Reference](https://developers.google.com/protocol-buffers/docs/reference/cpp)

### Basics of Data Access
In C++, you need to be careful about memory management and implicit (unintended) copying.

When managing objects in the heap area, you need to call the constructor with new, and the user must properly manage the lifecycle of the instance. Also, assigning an instance created on the stack to another variable results in a copy of the object, which can become a bottleneck when performed extensively in loops. Therefore, you want to avoid both as much as possible.

You can avoid this using smart pointers, but the C++ class definitions generated by protoc cleverly avoid these issues. When operating in C++, consider memory management and efficiency, and note that the access methods differ between primitive (bool, int32, double, etc.) types and string and message types (user-defined).

- If the return value is a reference, always receive it as a reference
  - Receive with auto& or const auto&
  - **If you do not receive as a reference, a copy occurs** so be careful (it would be nice if it warned at compile time)

- When updating data, receive the return value as a pointer with add_xxx() or mutable_xxx()
  - When adding to a list, use add_xxx() and receive the added object
  - For maps, receive with mutable_xxx() (mutable_ always returns a pointer)
  - For messages, receive with mutable_xxx()
  - Since the return value is a pointer, it is good to receive with auto

Let's see how to operate specifically.

### Preparation

Suppose you have defined the following in a .proto file.

```protobuf:example.proto
syntax = "proto3";

message Product {
  int32             id        = 1; // primitive type
  string            name      = 2; // string
  Detail            detail    = 3; // message type
  repeated int32    ids       = 4; // list of primitive types
  repeated Material materials = 5; // list of message types
  map<int32, Value> value_map = 6; // map of message types
}

message Detail {
  int32 id = 1;
}

message Material {
  int32 id = 1;
}

message Value {
  int32 id = 1;
}
```

### Generated C++ Header File
The generated header file is not very user-friendly and contains a vast amount of information, so I have extracted only the key parts.

The generated class includes the following:

- Inherits Message
- Constructor
- Instance operation
- Member variable access

**Access to string and message types is always via pointer, reference, or move** to avoid unnecessary copies. The functions for accessing member variables are numerous because they are defined according to the purpose, but there are patterns in the function definitions, so it is not difficult once you learn them.

```cpp:example.pb.h
class Product final : public Message {
public:
  Product();
  Product(const Product& from);
  Product(Product&& from);

  ~Product() override;

  Product& operator=(const Product& from);
  Product& operator=(Product&& from) noexcept;

  void Swap(Product* other);
  void CopyFrom(const Product& from);
  void MergeFrom(const Product& from);
  void Clear() final;
  bool IsInitialized() const final;
  size_t ByteSizeLong() const final;

  // int32 id = 1;
  void clear_id();
  int32_t id() const;
  void set_id(int32_t value);

  // string name = 2;
  void clear_name();
  const std::string& name() const;
  template <typename ArgT0 = const std::string&, typename... ArgT>
  you set_name(ArgT0&& arg0, ArgT... args);
  std::string* mutable_name();
  std::string* release_name();
  you set_allocated_name(std::string* name);

  // Detail detail = 3;
  bool has_detail() const;
  you clear_detail();
  const Detail& detail() const;
  Detail* release_detail();
  Detail* mutable_detail();
  you set_allocated_detail(Detail* detail);

  // repeated int32 ids = 4;
  int ids_size() const;
  you clear_ids();
  int32_t ids(int index) const;
  you set_ids(int index, int32_t value);
  you add_ids(int32_t value);
  const RepeatedField<int32_t>& ids() const;
  RepeatedField<int32_t>* mutable_ids();

  // repeated Material materials = 5;
  int materials_size() const;
  you clear_materials();
  the Material& materials(int index) is const;
  Material* add_materials();
  const RepeatedPtrField<Material>& materials() is const;
  RepeatedPtrField<Material>* mutable_materials();
  Material* mutable_materials(int index);

  // map<int32, Value> value_map = 6;
  int value_map_size() is const;
  you clear_value_map();
  the Map<int32_t, Value>& value_map() is const;
  Map<int32_t, Value>* mutable_value_map();
};
```

### Inherits Message

[Message API](https://protobuf.dev/reference/cpp/api-docs/google.protobuf.message/)

The generated class inherits from Message. Functions and metadata that can be used in all messages are defined, allowing transparent use of messages.

Here is an example of outputting the contents of a message (debug output and JSON output).
```cpp
#include <google/protobuf/util/json_util.h>
#include "example.pb.h"

std::string ToJson(const google::protobuf::Message &m)
{
    std::string json;

    google::protobuf::util::JsonOptions option;
    option.add_whitespace = true;
    option.always_print_primitive_fields = true;

    google::protobuf::util::MessageToJsonString(m, &json, option);
    return json;
}

int main()
{
    Product product;
    product.set_id(123);
    product.set_name("Product 1");

    auto detail = product.mutable_detail();
    detail->set_id(999);

    // Debug string output
    std::cout << product.Utf8DebugString() << std::endl;

    // JSON string output
    std::cout << ToJson(product) << std::endl;

    return 0;
}
```

```json:Output Result
id: 123
name: "Product 1"
detail {
  id: 999
}

{
 "id": 123,
 "name": "Product 1",
 "detail": {
  "id": 999
 },
 "ids": [],
 "materials": [],
 "valueMap": {}
}
```

:::info
If you save the source code in utf-8 and specify /utf-8 in the compile options of Visual Studio, you can output data including Japanese.
:::

:::info
You can convert a JSON string to a message using google::protobuf::util::JsonStringToMessage().
:::

### Constructor

```cpp
Product();
Product(const Product& from);
Product(Product&& from);
```

There are default constructors, copy constructors, and move constructors. These are typical.

### Instance Operation

```cpp
Product& operator=(const Product& from);
Product& operator=(Product&& from) noexcept;

void Swap(Product* other);
you CopyFrom(const Product& from);
you MergeFrom(const Product& from);
you Clear() final;
bool IsInitialized() is const final;
size_t ByteSizeLong() is const final;
```

The copy assignment operator and move assignment operator are overloaded. Also, convenient functions such as Swap (swap processing), MergeFrom (append processing), Clear (clear processing), and CopyFrom (Clear and then execute MergeFrom) are generated.

### Access to Primitive Type Member Variables

```cpp
// int32 id = 1;
you clear_id();
int32_t id() is const;
you set_id(int32_t value);
```
There are only simple setter/getter and clear functions.

In the initial state, the value is unset, and it is set by set_xxx. If you get it when the value is unset, you can get the default value. clear_xxx makes it unset. If it is unset, that value is not output when serialized, making the data size smaller.

### Access to String Member Variables

```cpp
you clear_name();
const std::string& name() is const;
template <typename ArgT0 = const std::string&, typename... ArgT>
you set_name(ArgT0&& arg0, ArgT... args);
std::string* mutable_name();
std::string* release_name();
you set_allocated_name(std::string* name);
```

set_xxx is a function template, presumably to support moves.
The getter is a const reference.

`std::string* mutable_name()` returns a pointer and is used to change the value of the string.

`std::string* release_name()` obtains ownership of the string managed internally by the message. The message side becomes unset for the string. The developer needs to manage the lifecycle of the obtained string (pointer).

`you set_allocated_name(std::string* name)` makes the string (pointer) managed by the developer the ownership of the message side.

### Access to Message Type Member Variables

```cpp
// Detail detail = 3;
bool has_detail() is const;
you clear_detail();
const Detail& detail() is const;
Detail* release_detail();
Detail* mutable_detail();
you set_allocated_detail(Detail* detail);
```

It is similar to string, but there is no setter. To set a value, do the following:
```cpp
Product product;
auto detail = product.mutable_detail();
detail->set_id(999);
```

`product.mutable_detail()` returns the Detail instance if it exists, and if it is unset, it generates and returns a Detail instance. Therefore, whether an instance exists or not is determined by `bool has_detail() const`. Other operations are the same as for string.

### Access to List (Primitive Type) Member Variables

```cpp
  // repeated int32 ids = 4;
  int ids_size() is const;
  you clear_ids();
  int32_t ids(int index) is const;
  you set_ids(int index, int32_t value);
  you add_ids(int32_t value);
  const RepeatedField<int32_t>& ids() is const;
  RepeatedField<int32_t>* mutable_ids();
```
This is a list operation, so there are list size retrieval, clear, and setter/getter for elements at a specified index.

`you add_ids(int32_t value)` adds an element to the end of the list.

`const RepeatedField<int32_t>& ids() is const` returns a const reference to RepeatedField, a class representing a list.

[RepeatedField API](https://protobuf.dev/reference/cpp/api-docs/google.protobuf.repeated_field/)

RepeatedField is a class similar to std::vector. It has index access and size retrieval, as well as iterator begin() and iterator end(), allowing element access in a range-based loop.

### Index Loop and Range-Based Loop

```cpp
Product product;
for (int i = 0; i < 3; i++) {
    product.add_ids(i);
}

const auto& ids = product.ids();
for (int i = 0; i < ids.size(); i++) {
    std::cout << ids[i] << std::endl;
}

for (const auto& id : ids) { // Be careful not to copy by omitting &
    std::cout << id << std::endl;
}
```

`RepeatedField<int32_t>* mutable_ids()` returns a pointer to a modifiable RepeatedField.

### Access to List (Message Type) Member Variables

```cpp
  // repeated Material materials = 5;
  int materials_size() is const;
  you clear_materials();
  the Material& materials(int index) is const;
  Material* add_materials();
  the RepeatedPtrField<Material>& materials() is const;
  RepeatedPtrField<Material>* mutable_materials();
  Material* mutable_materials(int index);
```
The difference from the list (primitive type) is that the returned message is always a const reference or pointer. Also, adding to the list is done by `Material* add_materials()`, where an instance,is generated internally, and its pointer is returned. You then set values to that pointer.

`const RepeatedPtrField<Material>& materials() const` returns a const reference to RepeatedPtrField, a class representing a list of strings or message types.

[RepeatedPtrField API](https://protobuf.dev/reference/cpp/api-docs/google.protobuf.repeated_field/#RepeatedPtrField)

RepeatedPtrField is a class for handling lists of strings or message types, similar to RepeatedField, so you can perform similar operations. Access via mutable_xxx returns either a RepeatedPtrField or a pointer to the element at the specified index.

### Access to Map Member Variables

```cpp
  // map<int32, Value> value_map = 6;
  int value_map_size() const;
  void clear_value_map();
  const Map<int32_t, Value>& value_map() const;
  Map<int32_t, Value>* mutable_value_map();
```

This is for map operations. There are functions for getting the size of the map and clearing it, but not for setting/getting values for specific keys. You perform these operations after obtaining the Map class.

`const Map<int32_t, Value>& value_map() const` returns a const reference to the Map and its elements.

`Map<int32_t, Value>* mutable_value_map()` returns a pointer to the Map and its elements, allowing for updates.

[Map API](https://protobuf.dev/reference/cpp/api-docs/google.protobuf.map/)

Map has operations similar to std::unordered_map.

### Setting Values in a Map
You obtain the map as a pointer (modifiable state) and convert it to a reference to set values.
```cpp
Product product;

Value value;
value.set_id(5);

// Convert pointer to reference
auto& map = *product.mutable_value_map();
map[value.id()] = value;
```

### Checking if a Key Exists in a Map
```cpp
if (product.value_map().contains(8)) {
    // The key has a corresponding value
} else {
    // The key does not exist
}
```

### Getting Values from a Map and Referencing Data
```cpp
// Get value by at(key) from Map pointer
// Note: Runtime error if the key is not included
const auto& value = product.value_map().at(5);
```
The value obtained from value_map().at() is a const reference, so you cannot modify the value.

### Range-Based Loop Over a Map
```cpp
for (const auto& ite : product.value_map()) {
    auto k = ite.first;         // first is the key
    const auto& v = ite.second; // second is the value
}

// If compiling in compliance with C++17, tuples can be used as follows
for (const auto& [k, v] : product.value_map()) {
}
```

:::alert
Note that it is similar to std::unordered_map, not std::map. It stores data based on hash values, so the storage order is not specified. Therefore, it is necessary to be aware that you cannot output in dictionary order, for example.
Also, even if you register with the same key, if the instances are different, the order may differ when retrieving them.
:::

### Updating Data Retrieved from a Map

```cpp
// Get value by at(key) from Map pointer
// Note: Runtime error if the key is not included
auto& value = product.mutable_value_map()->at(5);

// Get value by [key] from Map reference
// Note: A new value is generated if the key is not included
auto& value = (*product.mutable_value_map())[5];

value.set_id(100);
```

Values obtained from mutable_xxx are not const references, so you can modify the values.

## Summary
The API clearly separates functions for referencing and updating messages, making it easy to understand. Additionally, you can handle it without much concern for memory management. If you need data communication or serialization in C++, consider using Protocol Buffers.
