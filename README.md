# XML Interpreter

Create nodes from xml by createNode and appendChildren.

```javascript
import { toJson } from "xml-interpreter";

test("attrs", () => {
  const xml = `<apple color="red"></apple>`;
  const result = toJson(xml);
  expect(result).toEqual([
    {
      type: "apple",
      color: "red",
    },
  ]);
});

test("add children", () => {
  const xml = `
    <panel>
      <string title="username"></string>
      <boolean title="is adult"></boolean>
    </panel>
    `;
  const result = toJson(xml);
  expect(result).toEqual([
    {
      type: "panel",
      children: [
        { type: "string", title: "username" },
        { type: "boolean", title: "is adult" },
      ],
    },
  ]);
});

test("customize builder", () => {
  const xml = `
  <mark height="2" weight="80" >
    <items title="a"></items>
    <items title="b"></items>
    <items title="c"></items>
  </mark>
  `;
  const result = toJson(xml, {
    createNode(label, props) {
      const { height, weight } = props;
      return { name: label, bmi: weight / (height * height) };
    },
    appendChildren(node, children) {
      if (node.name === "mark") {
        node.items = children
          .filter((item) => item.name === "items")
          .map((item) => item.title);
      }
      node.children = children;
    },
  });
  expect(result).toEqual([
    {
      name: "mark",
      bmi: 20,
      items: ["a", "b", "c"],
    },
  ]);
});
```
