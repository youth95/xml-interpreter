const tokenTypes = {
  TOKEN: "TOKEN",
  STRING: "STRING",
  NUMBER: "NUMBER",
  IDENTIFIER: "IDENTIFIER",
  ATTRIBUTE: "ATTRIBUTE",
  BEGIN_LABEL: "BEGIN_LABEL",
  END_LABEL: "END_LABEL",
};

function attribute_grammar(tokens, pos) {
  let i = pos;
  let kv = {};
  while (tokens.length > i) {
    if (
      tokens[i].type === tokenTypes.IDENTIFIER &&
      tokens[i + 1].type === tokenTypes.TOKEN &&
      tokens[i + 1].value === "=" &&
      (tokens[i + 2].type === tokenTypes.NUMBER ||
        tokens[i + 2].type === tokenTypes.STRING)
    ) {
      kv[tokens[i].value] = tokens[i + 2].value;
      i += 3;
    } else {
      break;
    }
  }
  return [
    i - pos,
    {
      type: tokenTypes.ATTRIBUTE,
      value: kv,
    },
  ];
}

function label_grammar(tokens, pos) {
  let kv = {};
  let limit = 0;
  if (
    tokens[pos + 0].value === "<" &&
    tokens[pos + 1].type === tokenTypes.IDENTIFIER &&
    ((tokens[pos + 2].type === tokenTypes.ATTRIBUTE &&
      tokens[pos + 3].value === ">") ||
      tokens[pos + 2].value === ">")
  ) {
    if (tokens[pos + 2].type === tokenTypes.ATTRIBUTE) {
      Object.assign(kv, tokens[pos + 2].value);
      limit += 1;
    }
    return [
      limit + 3,
      {
        type: tokenTypes.BEGIN_LABEL,
        value: {
          props: kv,
          label: tokens[pos + 1].value,
        },
      },
    ];
  } else if (
    tokens[pos + 0].value === "<" &&
    tokens[pos + 1].value === "/" &&
    tokens[pos + 2].type === tokenTypes.IDENTIFIER &&
    tokens[pos + 3].value === ">"
  )
    return [
      4,
      {
        type: tokenTypes.END_LABEL,
        value: {
          label: tokens[pos + 2].value,
        },
      },
    ];
  return [0];
}

function lex(xml) {
  const grammars = [
    // token
    (stream, pos) => {
      let value = null;
      switch (stream[pos]) {
        case "<":
          value = "<";
          break;
        case ">":
          value = ">";
          break;
        case "=":
          value = "=";
          break;
        case "/":
          value = "/";
          break;
      }
      if (value === null) return [0];
      return [
        1,
        {
          type: tokenTypes.TOKEN,
          value,
        },
      ];
    },
    // string
    (stream, pos) => {
      let found = false;
      let i = pos;
      if (stream[i] != '"') return [0];
      i++;
      while (stream.length > i)
        if (stream[i++] === '"') {
          found = true;
          break;
        }
      if (!found) return [0];
      else
        return [
          i - pos,
          {
            type: tokenTypes.STRING,
            value: stream.slice(pos + 1, i - 1),
          },
        ];
    },
    // number
    (stream, pos) => {
      let i = pos;
      let dir = "1234567890".split("");
      if (dir.find((item) => item === stream[i]) && stream[i] !== "0") {
        i++;
        while (dir.find((item) => item === stream[i])) i++;
        return [
          i - pos,
          {
            type: tokenTypes.NUMBER,
            value: new Number(stream.slice(pos, i)),
          },
        ];
      } else return [0];
    },
    // identifier
    (stream, pos) => {
      let i = pos;
      let dir = "qwertyuiopasdfghjklzxcvbnmQWERTYUIOPASDFGHJKLZXCVBNM_-".split(
        ""
      );
      while (stream.length > i) {
        if (dir.find((item) => item === stream[i]) === undefined) {
          break;
        }
        i++;
      }
      return [
        i - pos,
        {
          type: tokenTypes.IDENTIFIER,
          value: stream.slice(pos, i),
        },
      ];
    },
  ];
  let pos = 0;
  let tokens = [];
  while (xml.length > pos) {
    while (xml[pos] === " " || xml[pos] === "\n") pos++; // skip blank
    let gra = grammars.find((gra) => gra(xml, pos)[0] > 0);
    if (gra === undefined && pos !== xml.length) {
      console.log(pos, xml.length);
      throw new Error(`Lexical parsing error at: ${xml.slice(pos)}`);
    }
    let result = gra(xml, pos);
    pos += result[0];
    tokens.push(result[1]);
  }

  let keyValueTokens = [];
  pos = 0;
  while (tokens.length > pos) {
    let result = attribute_grammar(tokens, pos);
    if (result[0] !== 0) {
      pos += result[0];
      keyValueTokens.push(result[1]);
    } else {
      keyValueTokens.push(tokens[pos]);
      pos++;
    }
  }

  let labelValueTokens = [];
  pos = 0;
  while (keyValueTokens.length > pos) {
    let result = label_grammar(keyValueTokens, pos);
    if (result[0] !== 0) {
      pos += result[0];
      labelValueTokens.push(result[1]);
    } else {
      labelValueTokens.push(keyValueTokens[pos]);
      pos++;
    }
  }
  return labelValueTokens;
}

module.export.toJson = function toJson(xml, { createNode, appendChildren }) {
  const result = [];
  let stack = [];
  let children = [];
  const tokens = lex(xml);
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    if (token.type === tokenTypes.BEGIN_LABEL) {
      stack.push([i, token]);
    } else if (token.type === tokenTypes.END_LABEL) {
      let [entryIdx, entry] = stack.pop();
      if (entry.value.label !== token.value.label)
        throw new Error("labels are no match");
      let node = createNode(entry.value.label, entry.value.props);
      if (i - entryIdx > 1) {
        appendChildren(
          node,
          children.filter((item) => item[0] > entryIdx).map((item) => item[1])
        );
        children = children.filter((item) => item[0] < entryIdx);
      }
      children.push([i, node]);
    }
    if (stack.length === 0) {
      result.push(children[0][1]);
      children = [];
    }
  }
  return result;
};
