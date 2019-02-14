/*****************************
 * Setting up classes
 */

class Node {
    constructor(id, reflexive, x = 0, y = 0){
      this.id = id;
      this.reflexive = reflexive;
      this.x = x;
      this.y = y;
      this.isBlock = false;
      this.isFinal = false;
      this.initial = false;
    }
  }
  
class BlockNode extends Node {
  constructor(id, reflexive, desc = '',  x = 0, y = 0, nodes = [], links = [], force = undefined){
    super(id, reflexive, x, y);
    this.isBlock = true;
    this.desc = desc;
    // The nodes which are to be
    this.nodes = nodes;
    this.links = links;
    this.force = force;
  }
  // Dimenstions of the rectangle when in focus
  static maximizedHeight = 430;
  static maximizedWidth = 860;
  static fontSize = '18px';
  static headerHeight = 50; 
  // Standard Dimenstions
  static minimizedHeight = 40;
  static minimizedWidth = 80;
  static overlayHeight = 75;
  static overlayWidth = 115;
}
  
class SimpleNode extends Node {
  constructor(id, reflexive, x, y){
      super(id, reflexive, x, y);
  }

  static radius = 18;
}

class Link {
  constructor(source, target, label = '', bidirectional = false, up = true){
    // Source and target attributes are required by the simulation
    this.source = source;
    this.target = target;
    this.left = false;
    this.right = true;
    this.bidirectional = bidirectional;
    this.selftransition = false;
    this.up = up;
    // Letter
    this.label = label;
  }
}

class Tuple {
  constructor(first, second){
    this.first = first;
    this.second = second;
  }
}
  
   /****************************
    * Setting up classes
    */
  