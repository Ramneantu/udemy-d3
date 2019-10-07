class Node {
  constructor(id, reflexive, x = 0, y = 0) {
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
  export(){
      let states = '<stateSet>\n';
      this.nodes.forEach(d => {
          if(!d.isBlock)
              states += `<state sid='${d.id}' initial='${d.initial}' final='${d.reflexive}' posX='${d.x}' posY='${d.y}'/>\n`;
          else
              states += d.export();
      })
      states += '</stateSet>\n'
      let initialState = '';
      this.nodes.forEach(d => {
          if(d.initial)
              initialState = "<initialState><state sid='" + d.id + "' /></initialState>\n";
      })
      let acc = '<acceptingSet>\n';
      this.nodes.forEach(d => {
          if(d.reflexive)
              acc += "<state sid='" + d.id + "'/>\n"
      })
      acc += '</acceptingSet>\n';
      let transitions = '<transitionSet>\n';
      this.links.forEach((d, i) => {
          transitions += `<transition tid='${i}'>\n`
              +   `<from>${d.source.id}</from>\n`
              +   `<to>${d.target.id}</to>\n`
              +   `<label>${d.label}</label>\n`
              + '</transition>\n';
      })
      transitions += '</transitionSet>\n';

      return `<block sid='${this.id}' regex='${this.desc}' posX='${this.x}' posY='${this.y}'>\n` + states + transitions + acc + initialState + '</block>\n';
  }
  // Returns the maximum index of any node
  set(xml){
      // In the recursive case we set the description twice
      this.desc = $(xml).attr('regex');
      this.nodes = new Array();
      this.links = new Array();

      let lastId = 0;

      // Setting simple nodes
      $(xml).children('stateSet').children('state').each((i, d) => {
          this.nodes.push(new SimpleNode(parseInt($(d).attr('sid')),
              $(d).attr('final') === "true" ? true : false,
              parseFloat($(d).attr('posX')),
              parseFloat($(d).attr('posY')),
              $(d).attr('initial') === "true" ? true : false
              )
          )
          lastId = Math.max(lastId, parseInt($(d).attr('sid')));
      })
      // Setting blocks recursively
      $(xml).children('stateSet').children('block').each((i, d) => {
          const subBlock = new BlockNode( parseInt($(d).attr('sid')),
              false,
              $(d).attr('regex'),
              parseFloat($(d).attr('posX')),
              parseFloat($(d).attr('posY'))
          )
          lastId = Math.max(lastId, subBlock.id);
          this.nodes.push(subBlock);
          let unique = true;
          BlockNodeStatic.blocksList.forEach(d => {
              if(d.first.desc === subBlock.desc)
                  unique = false;
          })
          BlockNodeStatic.blocksList.push(new Tuple(subBlock, unique));
          lastId = Math.max(subBlock.set($(d)), lastId);
      })
      // Setting transitions
      $(xml).children('transitionSet').children('transition').each((i, d) => {
          const source = this.nodes.find(s => s.id === parseInt($(d).find('from').first().text()));
          const target = this.nodes.find(s => s.id === parseInt($(d).find('to').first().text()));
          const link = new Link(source, target, $(d).find('label').first().text().trim(), false, source.id < target.id);
          link.selftransition = (source === target);
          this.links.push(link);
      })
      // Setting bidirectional
      this.links.forEach(dx => {
          this.links.forEach(dy => {
              if(dx.target === dy.source && dx.source === dy.target && dx !== dy){
                  dx.bidirectional = true;
                  dy.bidirectional = true;
              }
          })
      })

      return lastId;
  }
}

const BlockNodeStatic = {
  maximizedHeight : 430,
  maximizedWidth : 860,
  headerHeight : 50,
  // Standard Dimenstions
  minimizedHeight : 40,
  minimizedWidth : 80,
  overlayHeight : 75,
  overlayWidth : 115,

  blocksList : new Array()
}

class SimpleNode extends Node {
  constructor(id, reflexive, x, y, initial){
      super(id, reflexive, x, y);
      this.initial = initial;
  }
}

const SimpleNodeStatic = {
  radius : 18
}

class Link {
  constructor(source, target, label = '', bidirectional = false, selftransition = false){
      // Source and target attributes are required by the simulation
      this.source = source;
      this.target = target;
      this.left = false;
      this.right = true;
      this.bidirectional = bidirectional;
      this.selftransition = selftransition;
      this.rotation = 0;
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
