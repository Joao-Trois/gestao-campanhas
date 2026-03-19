import fs from 'fs';
const data = JSON.parse(fs.readFileSync('C:\\Users\\TI 3\\.mcp-figma\\cache\\file_nodes_Jvo2kEyq3fkcvDX5FFEA2I_1773858923541.json'));

const targetIds = ['45:325', '136:1770'];
const results = {};

function formatColor({r, g, b, a}) {
  return `rgba(${Math.round(r*255)}, ${Math.round(g*255)}, ${Math.round(b*255)}, ${Number(a).toFixed(2)})`;
}

function extractStyles(node, path) {
  const currentPath = path ? `${path} > ${node.name}` : node.name;
  let info = { type: node.type, path: currentPath };
  
  if (node.fills && node.fills.length && node.fills[0].color) {
    info.color = formatColor(node.fills[0].color);
  } else if (node.background && node.background.length && node.background[0].color) {
    info.backgroundColor = formatColor(node.background[0].color);
  }
  if (node.strokes && node.strokes.length && node.strokes[0].color) {
    info.borderColor = formatColor(node.strokes[0].color);
    info.borderWeight = node.strokeWeight;
  }
  if (node.cornerRadius) info.borderRadius = node.cornerRadius;
  if (node.paddingLeft) {
    info.padding = `${node.paddingTop}px ${node.paddingRight}px ${node.paddingBottom}px ${node.paddingLeft}px`;
  }
  if (node.itemSpacing) info.gap = node.itemSpacing;
  
  if (node.type === 'TEXT') {
    info.text = node.characters.replace(/\n/g, '\\n');
    info.font = node.style?.fontFamily;
    info.fontSize = node.style?.fontSize;
    info.fontWeight = node.style?.fontWeight;
  }
  
  return info;
}

function traverse(node, targetId, path, collection) {
  if (node.id === targetId || path !== '') {
    const newPath = path === '' ? node.name : `${path} > ${node.name}`;
    collection.push(extractStyles(node, newPath));
    if (node.children) node.children.forEach(child => traverse(child, targetId, newPath, collection));
  } else if (node.children) {
    node.children.forEach(child => traverse(child, targetId, '', collection));
  }
}

targetIds.forEach(id => {
  const collection = [];
  Object.values(data.nodes).forEach(n => traverse(n.document, id, '', collection));
  results[id] = collection;
});

fs.writeFileSync('extracted-templates.json', JSON.stringify(results, null, 2));
console.log("Templates extracted to extracted-templates.json");
