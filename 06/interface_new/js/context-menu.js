// var menuEmptyArea = [{
//     title: 'Add a block',
//     action: function(elm, d, i) {
// 		addBlock.call(elm);
//     }
//   }, {
//     title: 'Add a node',
//     action: function(elm, d, i) {
// 		addNode.call(elm);
//     }
// 	}];
	
// var menuNode = [
// 	{
// 		title: 'Toggle final',
// 		action: function(elm, d, i){
// 			d.reflexive = !d.reflexive;
// 			restart();
// 		}
// 	},
// 	{
// 		title: 'Remove',
// 		action: function(elm, d, i) {
// 			selectedNode = d;
// 			deleteSelected.call(elm);
// 		}
// 	}
// ]

// var menuBlock = [{
// 		title: 'Expand',
// 		action: function(elm, d, i){
// 			pushContext(d);
// 			}
// 	}, {
// 		title: 'Remove',
// 		action: function(elm, d, i) {
// 			selectedNode = d;
// 			deleteSelected.call(elm);
// 		}
// 	}
// ]

// var menuToolboxBlock = [{
// 	title: 'Add',
// 	action: function(elm, d, i){
// 			toolbar.add(d);
// 		}
// }, {
// 	title: 'Edit',
// 	action: function(elm, d, i) {
// 		pushContext(d, false)
// 	}
// }
// ]

// var menuLink = [{
// 	title: 'Remove',
// 	action: function(elm, d, i){
// 			selectedLink = d;
// 			deleteSelected(d);
// 		}
// }
// ]


/*******************************
 * Actual Contextmenu Call
 */
let contextOpen;
d3.contextMenu = function (menu, openCallback) {
    // create the div element that will hold the context menu
    // top level context menu
	d3.select('body').selectAll('.d3-context-menu').data([1])
		.enter()
		.append('div')
		.attr('class', 'd3-context-menu');

	// close menu
	d3.select('body').on('click.d3-context-menu', function() {
		d3.select('.d3-context-menu').style('display', 'none');
		contextOpen = false;
	});

	// this gets executed when a contextmenu event occurs
	return function(data, index) {
		// Avoid multiple contextmenus being triggered at the same time
		d3.event.stopPropagation();
        // Captures the this pointer in case we need it later on	
		var elm = this;
		contextOpen = true;
		d3.selectAll('.d3-context-menu').html('');
		var list = d3.selectAll('.d3-context-menu').append('ul');
		list.selectAll('li').data(menu).enter()
			.append('li')
			.html(function(d) {
				return d.title;
			})
			.on('click', function(d, i) {
                d.action(elm, data, index);
                // Try to remove it?
				d3.select('.d3-context-menu').style('display', 'none');
				contextOpen = false;
			});

		// the openCallback allows an action to fire before the menu is displayed
		// an example usage would be closing a tooltip
		if (openCallback) openCallback(data, index);
			
		// display context menu
		d3.select('.d3-context-menu')
			.style('left', (d3.event.pageX - 2) + 'px')
			.style('top', (d3.event.pageY - 2) + 'px')
			.style('display', 'block');

		d3.event.preventDefault();
	};
};
