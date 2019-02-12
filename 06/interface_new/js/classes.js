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
}
  
class SimpleNode extends Node {
  constructor(id, reflexive, x, y){
      super(id, reflexive, x, y);
  }

  static radius = 18;
}

class Link {
  constructor(source, target, label = '', bidirectional = false){
    // Source and target attributes are required by the simulation
    this.source = source;
    this.target = target;
    this.left = false;
    this.right = true;
    this.bidirectional = bidirectional;
    this.up = true;
    // Letter
    this.label = label;
  }
}
  
   /****************************
    * Setting up classes
    */
  