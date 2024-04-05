---
title: Trying Protocol Buffers in C++
author: shuji-morimoto
date: 2024-03-08T00:00:00.000Z
tags: [ロボット, C++]
image: true
translate: true

---

:::alert
This article has been automatically translated.
The original article is [here](https://developer.mamezou-tech.com/blogs/2024/03/08/protocol-buffers-cpp/).
:::



In applications, there's often a need to send and receive data between processes, or to save and restore data to and from the file system or a database. For this purpose, there are many libraries available for converting objects to JSON or XML, among others, but Protocol Buffers is also an option.

This article introduces some tips and tricks based on my notes from when I previously used Protocol Buffers with C++. It assumes a certain level of knowledge about Protocol Buffers and memory management in C++.

## Background of Using Protocol Buffers in C++
I was developing a desktop application (C++) for product design. The design data was saved and loaded from local files. We had the following requirements and requests:

- Want to keep schema definitions for persistence as data
- Need to handle data of several MBytes
- Want to reduce data size when persisting
- Serialization and deserialization should be fast
- Want to serialize and deserialize the data structure held by the app as is
- Persistent data can be binary
- Want to maintain backward compatibility
- Don't want to spend too much development effort on saving and loading data

XML can end up with more space taken up by element tags and attribute names than the data itself, and parsing tends to be relatively slow. Also, handling JSON in C++ requires dealing with a key-value format (map), requiring careful attention to key names and data types for setting/getting.

Protocol Buffers meets the above requirements, allowing the use of pre-compiled data types and direct serialization.

"Schema definition by proto file" == "C++ class definition (*.h and *.cc generation)" corresponds one-to-one, so the data to be serialized is verified data.

## Protocol Buffers Definition File (.proto) Format & Style

Referenced from [Language Guide (proto 3)](https://developers.google.com/protocol-buffers/docs/proto3)

### Available Data Types

All scalar data types are available.

double, float, int32, int64, uint32, uint64, sint64, fixed32, fixed64, sfixed32, sfixed64, bool, string, bytes

Timestamp types and structured types (JSON-like) are also provided by the library and can be used by importing them.

### Rules for Maintaining Backward Compatibility

- Fields in a message are identified by field numbers.
- Field names can be changed
- Fields can be removed (the field number becomes permanently unassigned)
    - reserved field number n, field number m, field number x to field number y;
    - reserved "field name 1", "field name 2";
- Changing the type of a field is not allowed
- Changing the field number of a field is not allowed
- Adding fields is allowed (assigning new field numbers)
- Field numbers for message fields start from 1
    - However, 19000-19999 are reserved numbers and cannot be used

### Rules for Defining enum Types
- Values are in uppercase snake case
    - Example: HELLO_WORLD
- Values start from 0
    - 0 represents unspecified
- **Different enum types cannot define the same value**
    - The following will result in duplication errors for UNSPECIFIED and A
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

    - Corrected version 1: Always prefix values to avoid duplication
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

    - Corrected version 2: Define each enum type within a message
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

    // Using enums in message definitions
    message Xyz {
      enum Foo.Enum foo = 1;
      enum Bar.Enum bar = 2;
    }
    ```

### Style Guide for proto Files
- Indentation is 2 spaces
- File names are in lowercase snake case
- Message names are in camel case
- Fields are in snake case
- Names of arrays with repeated are plural
- Enum names are in camel case, enum value names use uppercase and underscores
- The first value of an enum should be id=0 and named UNSPECIFIED (unspecified)
- When defining RPC services, both the service name and RPC function names should be in camel case

### Importing Data Types
If you want to split *.proto files by package or message and use messages defined in other *.proto files, use import. Predefined messages can also be used. The following import "google/..." refers to proto files in the include folder.
```protobuf
syntax = "proto3";
// To use various structured data types (JSON-like types)
import "google/protobuf/struct.proto";

message MyObject {
  int32  no                   = 1;
  string name                 = 2;
  google.protobuf.Struct json = 3;
}
```

- You can specify as many folders containing *.proto files as you want with the protoc `--proto_path` parameter
- The C++ API is defined in include/google/protobuf/struct.pb.h
- You can directly use the Struct type in your C++ code

### Specifying options
Options are interpreted in a specific context.
[List of options](https://github.com/protocolbuffers/protobuf/blob/master/src/google/protobuf/descriptor.proto)

Optimization-related options are specified with `optimize_for`.
```protobuf
// If you want to use a lightweight runtime
option optimize_for = LITE_RUNTIME;
```
:::alert
Optimizing for LITE_RUNTIME reduces library size but disables functions such as google::protobuf::util::MessageToJsonString() for converting messages to JSON strings.
:::

If you want to use protobuf's memory allocation buffer, specify it with `cc_enable_arenas`.
- An optimization and speed-up process for memory management called Arena
- Messages are constructed on the Arena and not deleted
- The lifecycle of the Arena area and message objects are synchronized

```protobuf
option cc_enable_arenas = true;
```

## Protocol Buffers C++ API
In environments like Python or Java, where memory safety mechanisms are provided at runtime, you don't have to worry too much about the lifecycle of objects. However, in C++, developers need to manage it themselves. Therefore, the Protocol Buffers C++ API is designed with memory safety and efficiency in mind (to reduce the burden on developers).

[C++ Tutorial](https://developers.google.com/protocol-buffers/docs/cpptutorial)

[C++ API Reference](https://developers.google.com/protocol-buffers/docs/reference/cpp)

### Basic Data Access
In C++, you need to be careful about memory management and implicit (unintended) copying.

When managing objects in the heap area, you need to call the constructor with new, and the user needs to manage the lifecycle of the instance properly. Also, assigning a stack-generated instance to another variable results in an object copy, which can become a bottleneck when done in large quantities in loop processing. Therefore, you want to avoid both as much as possible.

Smart pointers can be used to avoid these issues, but the C++ class definitions generated by protoc cleverly avoid these issues. When operating in C++, memory management and efficiency are considered, and the access methods differ between primitive (bool, int32, double, etc.) types and string or message types (user-defined).

- If the return value is a reference, always receive it as a reference
  - Receive with auto& or const auto&
  - **If not received as a reference, a copy occurs** so be careful (wish it would warn at compile time)

- When updating data, receive the return value as a pointer with add_xxx() or mutable_xxx()
  - When adding to a list, use add_xxx() to receive the added object
  - For maps, receive with mutable_xxx() (mutable_ always returns a pointer)
  - For messages, receive with mutable_xxx()
  - Since the return value is a pointer, it's good to receive with auto

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

### Generated C++ Header File by protoc
The automatically generated header file is not very readable and contains a vast amount of information, so I've extracted only the essential parts.

The generated class includes the following:

- Inherits Message
- Constructor
- Instance operation
- Member variable access

**Access to string or message types is always a pointer, reference, or move**, avoiding unnecessary copies. There are many functions for member variable access because functions are defined according to the purpose, but there are patterns to the function definitions, so it's not difficult once you learn them.

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
  void set_name(ArgT0&& arg0, ArgT... args);
  std::string* mutable_name();
  std::string* release_name();
  void set_allocated_name(std::string* name);

  // Detail detail = 3;
  bool has_detail() const;
  void clear_detail();
  const Detail& detail() const;
  Detail* release_detail();
  Detail* mutable_detail();
  void set_allocated_detail(Detail* detail);

  // repeated int32 ids = 4;
  int ids_size() const;
  void clear_ids();
  int32_t ids(int index) const;
  void set_ids(int index, int32_t value);
  void add_ids(int32_t value);
  const RepeatedField<int32_t>& ids() const;
  RepeatedField<int32_t>* mutable_ids();

  // repeated Material materials = 5;
  int materials_size() const;
  void clear_materials();
  const Material& materials(int index) const;
  Material* add_materials();
  const RepeatedPtrField<Material>& materials() const;
  RepeatedPtrField<Material>* mutable_materials();
  Material* mutable_materials(int index);

  // map<int32, Value> value_map = 6;
  int value_map_size() const;
  void clear_value_map();
  const Map<int32_t, Value>& value_map() const;
  Map<int32_t, Value>* mutable_value_map();
};
```

### Inherits Message

[Message API](https://protobuf.dev/reference/cpp/api-docs/google.protobuf.message/)

The generated class inherits from Message. Functions and metadata references that can be used for all messages are defined, allowing transparent use of messages.

Below is an example of outputting the content of a message (debug output and JSON output).
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
If you save the source code in utf-8 and specify the /utf-8 compile option in Visual Studio, you can output data including Japanese.
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

There are default, copy, and move constructors, which are typical.

### Instance Operation

```cpp
Product& operator=(const Product& from);
Product& operator=(Product&& from) noexcept;

void Swap(Product* other);
void CopyFrom(const Product& from);
void MergeFrom(const Product& from);
void Clear() final;
bool IsInitialized() const final;
size_t ByteSizeLong() const final;
```

Copy and move assignment operators are overloaded. Additionally, Swap (swap operation), MergeFrom (append operation), Clear (clear operation), and CopyFrom (Clear and then MergeFrom) are convenient functions that are also generated.

### Access to Primitive Type Member Variables

```cpp
// int32 id = 1;
void clear_id();
int32_t id() const;
void set_id(int32_t value);
```
There are only simple setter/getter and clear functions.

Initially, the value is unset until set_xxx is called. If you get an unset value, you will receive the default value. clear_xxx makes it unset. If unset, the value is not output during serialization, reducing the data size.

### Access to String Member Variables

```cpp
void clear_name();
const std::string& name() const;
template <typename ArgT0 = const std::string&, typename... ArgT>
void set_name(ArgT0&& arg0, ArgT... args);
std::string* mutable_name();
std::string* release_name();
void set_allocated_name(std::string* name);
```

set_xxx is a function template, presumably to support move.
The getter is a const reference.

`std::string* mutable_name()` returns a pointer and is used to change the string's value.

`std::string* release_name()` obtains ownership of the string managed internally by the message. The message side becomes unset for the string. The developer needs to manage the lifecycle of the obtained string (pointer).

`void set_allocated_name(std::string* name)` makes the string (pointer) managed by the developer the ownership of the message side.

### Access to Message Type Member Variables

```cpp
// Detail detail = 3;
bool has_detail() const;
void clear_detail();
const Detail& detail() const;
Detail* release_detail();
Detail* mutable_detail();
void set_allocated_detail(Detail* detail);
```

Similar to string, but without a setter. To set a value, you do the following.
```cpp
Product product;
auto detail = product.mutable_detail();
detail->set_id(999);
```

When `product.mutable_detail()` is executed, if a Detail instance exists, it returns that; if unset, it generates and returns a Detail instance. Therefore, whether an instance exists is determined by `bool has_detail() const`. Other operations are the same as for string.

### Access to List (Primitive Type) Member Variables

```cpp
  // repeated int32 ids = 4;
  int ids_size() const;
  void clear_ids();
  int32_t ids(int index) const;
  void set_ids(int index, int32_t value);
  void add_ids(int32_t value);
  const RepeatedField<int32_t>& ids() const;
  RepeatedField<int32_t>* mutable_ids();
```
This is for list operations, so there are functions for getting the list size, clearing, and setter/getter for elements at a specified index.

`void add_ids(int32_t value)` adds an element to the end of the list.

`const RepeatedField<int32_t>& ids() const` returns a const reference to RepeatedField, a class representing the list.

[RepeatedField API](https://protobuf.dev/reference/cpp/api-docs/google.protobuf.repeated_field/)

RepeatedField is similar to std::vector. It supports index access and size getting, and since it has iterator begin() and iterator end(), you can access elements with a range-based loop.

### Index Loop and Range-based Loop

```cpp
Product product;
for (int i = 0; i < 3; i++) {
    product.add_ids(i);
}

const auto& ids = product.ids();
for (int i = 0; i < ids.size(); i++) {
    std::cout << ids[i] << std::endl;
}

for (const auto& id : ids) { // Note: not adding & results in a copy
    std::cout << id << std::endl;
}
```

`RepeatedField<int32_t>* mutable_ids()` returns a pointer to a mutable RepeatedField.

### Access to List (Message Type) Member Variables

```cpp
  // repeated Material materials = 5;
  int materials_size() const;
  void clear_materials();
  const Material& materials(int index) const;
  Material* add_materials();
  const RepeatedPtrField<Material>& materials() const;
  RepeatedPtrField<Material>* mutable_materials();
  Material* mutable_materials(int index);
```
The difference from the list (primitive type) is that the returned messages are always a const reference or pointer. Also, adding to the list is done with `Material* add_materials()`, where an instance is generated internally, and its pointer is returned. You set values to that pointer.

`const RepeatedPtrField<Material>& materials() const` returns a
