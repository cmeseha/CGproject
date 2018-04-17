/*global self */

let Voronoi = {
	// Properties
	sites: [],
	siteEvents: [],
	circEvents: [],
	arcs: [],
	edges: [],
	sweep: 0,
	SITE_EVENT: 0,
	CIRCLE_EVENT: 1,
	VOID_EVENT: -1,
	DEFAULT_NUM_SITES: 0,
	NUM_SITES_PROCESSED: 0,
	BINARY_SEARCHES: 0,
	BINARY_SEARCH_ITERATIONS: 0,
	PARABOLIC_CUT_CALCS: 0,
	ALL_PARABOLIC_CUT_CALCS: 0,
	BEACHLINE_SIZE: 0,
	CIRCLE_QUEUE_SIZE: 0,
	NUM_VOID_EVENTS: 0,
	NUM_CIRCLE_EVENTS: 0,
	TOTAL_NUM_EDGES: 0,
	NUM_DESTROYED_EDGES: 0,
	sqrt: self.Math.sqrt,
	abs: self.Math.abs,
	floor: self.Math.floor,
	random: self.Math.random,
	round: self.Math.round,
	min: self.Math.min,
	max: self.Math.max,
	pow: self.Math.pow,
	PI: self.Math.PI,
	isNaN: self.isNaN,
	canvas: null,
	canvasMargin: 0,
	bbox: {xl:0,xr:800,yt:0,yb:600},

	// Objects
	Beachsection: function(site) {
		this.site = site;
		this.edge = null;
		// below is strictly for caching purpose
		this.sweep = -Infinity;
		this.lid = 0;
		this.circleEvent = undefined;
		},

	Site: function(x,y) {
		this.id = this.constructor.prototype.idgenerator++;
		this.x = x;
		this.y = y;
		},

	Cell: function(site) {
		this.site = site;
		this.halfedges = [];
		},

	Edge: function(lSite,rSite) {
		this.id = this.constructor.prototype.idgenerator++;
		this.lSite = lSite;
		this.rSite = rSite;
		this.va = this.vb = undefined;
		},

	Vertex: function(x,y) {
		this.x = x;
		this.y = y;
		},

	Halfedge: function(site,edge) {
		this.site = site;
		this.edge = edge;
		},

	//  Methods
	init: function() {
		// prototype inner classes to stop repeating code
		this.Beachsection.prototype.PARENT = this;
		this.Beachsection.prototype.sqrt = self.Math.sqrt;
		// return the intersection with parabola 'left'
		this.Beachsection.prototype._leftParabolicCut=function(site,left,directrix) {
			this.PARENT.PARABOLIC_CUT_CALCS++;
			let rfocx = site.x;
			let rfocy = site.y;
			// parabola in degenerate case
			if (rfocy == directrix) {return rfocx;}
			let lfocx = left.x;
			let lfocy = left.y;
			// parabola in degenerate case where focus is on directrix
			if (lfocy == directrix) {return lfocx;}
			// both parabolas have same distance to directrix, break point is midway
			if (rfocy == lfocy) {return (rfocx+lfocx)/2;}
			// calculate break point
			let pby2 = rfocy-directrix;
			let plby2 = lfocy-directrix;
			let hl = lfocx-rfocx;
			let aby2 = 1/pby2-1/plby2;
			let b = hl/plby2;
			return (-b+this.sqrt(b*b-2*aby2*(hl*hl/(-2*plby2)-lfocy+plby2/2+rfocy-pby2/2)))/aby2+rfocx;
			};
		this.Beachsection.prototype.leftParabolicCut=function(left,sweep){
			this.PARENT.ALL_PARABOLIC_CUT_CALCS++;
			if (this.sweep !== sweep || this.lid !== left.id) {
				this.sweep = sweep;
				this.lid = left.id;
				this.lBreak = this._leftParabolicCut(this.site,left,sweep);
				}
			return this.lBreak;
			};
		this.Beachsection.prototype.isCollapsing=function(){
			return this.circleEvent !== undefined && this.circleEvent.type === this.PARENT.CIRCLE_EVENT;
			};

		this.Site.prototype.idgenerator = 1;

		this.Edge.prototype.isLineSegment = function() {
			return Boolean(this.id) && Boolean(this.va) && Boolean(this.vb);
			};
		this.Edge.prototype.idgenerator = 1;

		this.Halfedge.prototype.isLineSegment = function() {
			return Boolean(this.edge.id) && Boolean(this.edge.va) && Boolean(this.edge.vb);
			};
		this.Halfedge.prototype.getStartpoint = function() {
			return this.edge.lSite.id == this.site.id ? this.edge.va : this.edge.vb;
			};
		this.Halfedge.prototype.getEndpoint = function() {
			return this.edge.lSite.id == this.site.id ? this.edge.vb : this.edge.va;
			};

		// prepare canvas
		this.initCanvas();

		// randomly generate a bunch of sites
		this.generateSites(this.DEFAULT_NUM_SITES);
		},

	// comparison methods
	EPSILON: 1e-4,
	equalWithEpsilon: function(a,b){return this.abs(a-b)<1e-4;},
	greaterThanWithEpsilon: function(a,b){return (a-b)>1e-4;},
	greaterThanOrEqualWithEpsilon: function(a,b){return (b-a)<1e-4;},
	lessThanWithEpsilon: function(a,b){return (b-a)>1e-4;},
	lessThanOrEqualWithEpsilon: function(a,b){return (a-b)<1e-4;},

	// Sites management
	clearSites: function() {
		this.sites = [];
		this.reset();
		// reset id generators
		this.Site.prototype.idgenerator = 1;
		this.Edge.prototype.idgenerator = 1;
		},

	addSite: function(x,y) {
		this.sites.push(new this.Site(x,y));
		this.reset();
		this.processQueueAll();
		},

	generateSites: function(n) {
		this.randomSites(n);
		this.reset();
		this.processQueueAll();
		},

	randomSites: function(n) {
		let margin = this.canvasMargin;
		let xo = this.bbox.xl+margin;
		let dx = this.bbox.xr-margin*2;
		let yo = this.bbox.yt+margin;
		let dy = this.bbox.yb-margin*2;
		for (let i=0; i<n; i++) {
			this.sites.push(new this.Site(this.round(xo+this.random()*dx),this.round(yo+this.random()*dy)));
			}
		},

	// Fortune algorithm
	reset: function() {
		this.NUM_SITES_PROCESSED = 0;
		this.BINARY_SEARCHES = 0;
		this.BINARY_SEARCH_ITERATIONS = 0;
		this.PARABOLIC_CUT_CALCS = 0;
		this.ALL_PARABOLIC_CUT_CALCS = 0;
		this.BEACHLINE_SIZE = 0;
		this.CIRCLE_QUEUE_SIZE = 0;
		this.LARGEST_CIRCLE_QUEUE_SIZE = 0;
		this.NUM_VOID_EVENTS = 0;
		this.NUM_CIRCLE_EVENTS = 0;
		this.TOTAL_NUM_EDGES = 0;
		this.NUM_DESTROYED_EDGES = 0;
		this.cellsClosed = false;
		this.queueInit();
		this.draw();
		},

	// calculate the left break point of beach section
	leftBreakPoint: function(iarc, sweep) {
		let arc = this.arcs[iarc];
		let site = arc.site;
		if (site.y == sweep) {return site.x;}
		if (iarc === 0) {return -Infinity;}
		return arc.leftParabolicCut(this.arcs[iarc-1].site,sweep);
		},

	// calculate the right break point of beach section
	rightBreakPoint: function(iarc, sweep) {
		if (iarc < this.arcs.length-1) {
			return this.leftBreakPoint(iarc+1,sweep);
			}
		let site = this.arcs[iarc].site;
		return site.y == sweep ? site.x : Infinity;
		},

	// find the index where a new site should be inserted.
	findInsertionPoint: function(x, sweep) {
		this.BINARY_SEARCHES++;
		let n = this.arcs.length;
		if (!n) { return 0; }
		let l = 0;
		let r = n;
		let i;
		while (l<r) {
			this.BINARY_SEARCH_ITERATIONS++;
			i = (l+r)>>1;
			if (this.lessThanWithEpsilon(x,this.leftBreakPoint(i,sweep))) {
				r = i;
				continue;
				}
			// check if x after right break point
			if (this.greaterThanOrEqualWithEpsilon(x,this.rightBreakPoint(i,sweep))) {
				l = i+1;
				continue;
				}
			return i;
			}
		return l;
		},

	findDeletionPoint: function(x, sweep) {
		this.BINARY_SEARCHES++;
		let n = this.arcs.length;
		if (!n) { return 0; }
		let l = 0;
		let r = n;
		let i;
		let xcut;
		while (l<r) {
			this.BINARY_SEARCH_ITERATIONS++;
			i = (l+r)>>1;
			xcut = this.leftBreakPoint(i,sweep);
			if (this.lessThanWithEpsilon(x,xcut)) {
				r=i;
				continue;
				}
			if (this.greaterThanWithEpsilon(x,xcut)) {
				l = i+1;
				continue;
				}
			xcut = this.rightBreakPoint(i,sweep);
			if (this.greaterThanWithEpsilon(x,xcut)) {
				l = i+1;
				continue;
				}
			if (this.lessThanWithEpsilon(x,xcut)) {
				r = i;
				continue;
				}
			return i;
			}
		},

	// this creates and adds an edge to internal collection, and also create
	// two halfedges which are added to each site's counterclockwise array
	// of halfedges.
	createEdge: function(lSite,rSite,va,vb) {
		let edge = new this.Edge(lSite,rSite);
		this.edges.push(edge);
		if (va !== undefined) {
			this.setEdgeStartpoint(edge,lSite,rSite,va);
			}
		if (vb !== undefined) {
			this.setEdgeEndpoint(edge,lSite,rSite,vb);
			}
		this.cells[lSite.id].halfedges.push(new this.Halfedge(lSite,edge));
		this.cells[rSite.id].halfedges.push(new this.Halfedge(rSite,edge));
		return edge;
		},

	createBorderEdge: function(lSite,va,vb) {
		let edge = new this.Edge(lSite,null);
		edge.va = va;
		edge.vb = vb;
		this.edges.push(edge);
		return edge;
		},

	destroyEdge: function(edge) {
		edge.id = edge.va = edge.vb = undefined;
		},

	setEdgeStartpoint: function(edge, lSite, rSite, vertex) {
		if (edge.va === undefined && edge.vb === undefined) {
			edge.va = vertex;
			edge.lSite = lSite;
			edge.rSite = rSite;
			}
		else if (edge.lSite.id == rSite.id) {
			edge.vb = vertex;
			}
		else {
			edge.va = vertex;
			}
		},
	setEdgeEndpoint: function(edge, lSite, rSite, vertex) {
		this.setEdgeStartpoint(edge,rSite,lSite,vertex);
		},

	removeArc: function(event) {
		let x = event.center.x;
		let y = event.center.y;
		let sweep = event.y;
		let deletionPoint = this.findDeletionPoint(x, sweep);
		// look left
		let iLeft = deletionPoint;
		while (iLeft-1 > 0 && this.equalWithEpsilon(x,this.leftBreakPoint(iLeft-1,sweep)) ) {
			iLeft--;
			}
		// look right
		let iRight = deletionPoint;
		while (iRight+1 < this.arcs.length && this.equalWithEpsilon(x,this.rightBreakPoint(iRight+1,sweep)) ) {
			iRight++;
			}

		// walk through all the collapsed beach sections and set the start point
		// of their left edge
		let lArc, rArc;
		for (let iArc=iLeft; iArc<=iRight+1; iArc++) {
			lArc = this.arcs[iArc-1];
			rArc = this.arcs[iArc];
			this.setEdgeStartpoint(rArc.edge,lArc.site,rArc.site,new this.Vertex(x,y));
			}

		// void circle events of collapsed beach sections and adjacent beach sections
		this.voidCircleEvents(iLeft-1,iRight+1);

		// removed collapsed beach sections from beachline
		this.arcs.splice(iLeft,iRight-iLeft+1);

		// create new edge as we have a new transition between
		// two beach sections which were previously not adjacent
		lArc = this.arcs[iLeft-1];
		rArc = this.arcs[iLeft];

		rArc.edge = this.createEdge(lArc.site,rArc.site,undefined,new this.Vertex(x,y));

		// create circle events if any for beach sections left in the beachline
		// adjacent to collapsed sections
		this.addCircleEvents(iLeft-1,sweep);
		this.addCircleEvents(iLeft,sweep);
		},

	addArc: function(site) {
		// find insertion point of new beach section on the beachline
		let newArc = new this.Beachsection(site);
		let insertionPoint = this.findInsertionPoint(site.x,site.y);

		// insert as last beach section
		if (insertionPoint == this.arcs.length) {
			// add new beach section
			this.arcs.push(newArc);
			// first beach section means no edge is created
			if (insertionPoint === 0) {return;}
			// new transition between two beach sections is created, create an edge
			newArc.edge = this.createEdge(this.arcs[insertionPoint-1].site,newArc.site);

			return;
			}

		let lArc, rArc;

		// new beach section to insert falls in between two existing beach sections
		// a new end point for one edge is defined, and two new edges are defined.
		if (insertionPoint > 0 &&
			this.equalWithEpsilon(site.x,this.rightBreakPoint(insertionPoint-1,site.y)) &&
			this.equalWithEpsilon(site.x,this.leftBreakPoint(insertionPoint,site.y))) {

			// transition disappears, new vertex is defined,
			// two new edges are defined
			lArc = this.arcs[insertionPoint-1];
			rArc = this.arcs[insertionPoint];

			// invalidate circle events
			this.voidCircleEvents(insertionPoint-1,insertionPoint);

			// transition disappears, a vertex is defined at the point
			let circle = this.circumcircle(lArc.site,site,rArc.site);
			this.setEdgeStartpoint(rArc.edge,lArc.site,rArc.site,new this.Vertex(circle.x,circle.y));

			// two new transitions appear at the new vertex location
			newArc.edge = this.createEdge(lArc.site,newArc.site,undefined,new this.Vertex(circle.x,circle.y));
			rArc.edge = this.createEdge(newArc.site,rArc.site,undefined,new this.Vertex(circle.x,circle.y));

			// insert new beach section
			this.arcs.splice(insertionPoint,0,newArc);

			// check whether the beach sections are collapsing
			this.addCircleEvents(insertionPoint-1,site.y);
			this.addCircleEvents(insertionPoint+1,site.y);

			return;
			}

		// invalidate circle event possibly associated with the beach section
		// to split
		this.voidCircleEvents(insertionPoint);

		// insert new beach section into beachline
		lArc = this.arcs[insertionPoint];
		rArc = new this.Beachsection(lArc.site);
		this.arcs.splice(insertionPoint+1,0,newArc,rArc);

		// new transition between beach sections, a new edge is created
		newArc.edge = rArc.edge = this.createEdge(lArc.site,newArc.site);

		// check whether the beach sections are collapsing
		// create circle events to handle the point of collapse.
		this.addCircleEvents(insertionPoint,site.y);
		this.addCircleEvents(insertionPoint+2,site.y);
		},

	circumcircle: function(a,b,c) {
		let ax=a.x;
		let ay=a.y;
		let bx=b.x-ax;
		let by=b.y-ay;
		let cx=c.x-ax;
		let cy=c.y-ay;
		let d=2*(bx*cy-by*cx);
		let hb=bx*bx+by*by;
		let hc=cx*cx+cy*cy;
		let x=(cy*hb-by*hc)/d;
		let y=(bx*hc-cx*hb)/d;
		return {x:x+ax,y:y+ay,radius:this.sqrt(x*x+y*y)};
		},

	addCircleEvents: function(iArc,sweep) {
		if (iArc <= 0 || iArc >= this.arcs.length-1) {return;}
		let arc=this.arcs[iArc];
		let lSite=this.arcs[iArc-1].site;
		let cSite=this.arcs[iArc].site;
		let rSite=this.arcs[iArc+1].site;
		// any two sites repeated in the beach section cant converge
		if (lSite.id==rSite.id || lSite.id==cSite.id || cSite.id==rSite.id) {return;}
		// if points l->c->r are clockwise, center beach section does not converge
		if ((lSite.y-cSite.y)*(rSite.x-cSite.x)<=(lSite.x-cSite.x)*(rSite.y-cSite.y)) {return;}
		// find circumscribed circle
		let circle=this.circumcircle(lSite,cSite,rSite);
		let ybottom=circle.y+circle.radius;
		if (!this.greaterThanOrEqualWithEpsilon(ybottom,sweep)) {return;}
		let circEvent={
			type: this.CIRCLE_EVENT,
			site: cSite,
			x: circle.x,
			y: ybottom,
			center: {x:circle.x, y:circle.y}
			};
		arc.circleEvent = circEvent;
		this.queuePushCircle(circEvent);
		},

	voidCircleEvents: function(iLeft,iRight) {
		if ( iRight === undefined ) {iRight = iLeft;}
		iLeft = this.max(iLeft,0);
		iRight = this.min(iRight,this.arcs.length-1);
		while (iLeft <= iRight) {
			let arc = this.arcs[iLeft];
			if ( arc.circleEvent !== undefined ) {
				arc.circleEvent.type = this.VOID_EVENT;
				arc.circleEvent = undefined;
				}
			iLeft++;
			}
		},

	queueInit: function() {
		this.sweep = 0;
		this.siteEvents = [];
		let n = this.sites.length;
		for (let i=0; i<n; i++) {
			let site = this.sites[i];
			this.queuePushSite({type:this.SITE_EVENT, x:site.x, y:site.y, site:site});
			}
		this.NUM_SITES_PROCESSED = this.siteEvents.length;
		this.circEvents = [];
		this.arcs = [];
		this.edges = [];
		this.cells = {};
		},

	// get rid of void events from the circle events queue
	queueSanitize: function() {
		let q = this.circEvents;
		let iRight = q.length;
		if (!iRight) {return;}
		// remove trailing events
		let iLeft = iRight;
		while (iLeft && q[iLeft-1].type === this.VOID_EVENT) {iLeft--;}
		let nEvents = iRight-iLeft;
		if (nEvents) {
			this.NUM_VOID_EVENTS += nEvents;
			q.splice(iLeft,nEvents);
			}
		// remove all void events if queue grew too large
		let nArcs = this.arcs.length;
		if (q.length < nArcs*2) {return;}
		while (true) {
			iRight = iLeft-1;
			// find a right-most void event
			while (iRight>0 && q[iRight-1].type !== this.VOID_EVENT) {iRight--;}
			if (iRight<=0) {break;}
			// find a right-most event to the left of iRight
			iLeft = iRight-1;
			while (iLeft>0 && q[iLeft-1].type === this.VOID_EVENT) {iLeft--;}
			nEvents = iRight-iLeft;
			this.NUM_VOID_EVENTS += nEvents;
			q.splice(iLeft,nEvents);
			// abort if queue has gotten small enough
			if (q.length < nArcs) {return;}
			}
		},

	queueIsEmpty: function() {
		this.queueSanitize();
		return this.siteEvents.length === 0 && this.circEvents.length === 0;
		},

	queuePeek: function() {
		this.queueSanitize();
		// we will return a site or circle event
		let siteEvent = this.siteEvents.length > 0 ? this.siteEvents[this.siteEvents.length-1] : null;
		let circEvent = this.circEvents.length > 0 ? this.circEvents[this.circEvents.length-1] : null;
		// if one is null
		if ( Boolean(siteEvent) !== Boolean(circEvent) ) {
			return siteEvent ? siteEvent : circEvent;
			}
		// both null
		if (!siteEvent) {
			return null;
			}
		// both valid, return earliest
		if (siteEvent.y < circEvent.y || (siteEvent.y == circEvent.y && siteEvent.x < circEvent.x)) {
			return siteEvent;
			}
		return circEvent;
		},

	queuePop: function() {
		let event = this.queuePeek();
		if (event) {
			if (event.type === this.SITE_EVENT) {
				this.siteEvents.pop();
				}
			else {
				this.circEvents.pop();
				}
			}
		return event;
		},

	queuePushSite: function(o) {
		let q = this.siteEvents;
		let r = q.length;
		if (r) {
			let l = 0;
			let i, c;
			while (l<r) {
				i = (l+r)>>1;
				c = o.y-q[i].y;
				if (!c) {c = o.x-q[i].x;}
				if (c>0) {r = i;}
				else if (c<0) {l = i+1;}
				else {return;}
				}
			q.splice(l,0,o);
			}
		else {
			q.push(o);
			}
		},

	queuePushCircle: function(o) {
		this.NUM_CIRCLE_EVENTS++;
		let q = this.circEvents;
		let r = q.length;
		if (r) {
			let l = 0;
			let i, c;
			while (l<r) {
				i = (l+r)>>1;
				c = o.y-q[i].y;
				if (!c) {c = o.x-q[i].x;}
				if (c>0) {r = i;}
				else {l = i+1;}
				}
			q.splice(l,0,o);
			}
		else {
			q.push(o);
			}
		},

	processQueueOne: function() {
		let event = this.queuePop();
		if (!event) {return;}
		this.sweep = event.y;
		if ( event.type === this.SITE_EVENT ) {
			this.cells[event.site.id] = new this.Cell(event.site);
			// add beach section
			this.addArc(event.site);
			this.BEACHLINE_SIZE += this.arcs.length;
			this.CIRCLE_QUEUE_SIZE += this.circEvents.length;
			this.LARGEST_CIRCLE_QUEUE_SIZE = this.max(this.circEvents.length,this.LARGEST_CIRCLE_QUEUE_SIZE);
			}
		else {
			// remove beach section
			this.removeArc(event);
			}
		// close all cells
		if (this.queueIsEmpty()) {
			this.closeCells();
			}
		},

	processQueueN: function(n) {
		while (n > 0 && !this.queueIsEmpty()) {
			this.processQueueOne();
			n -= 1;
			}
		if (this.queueIsEmpty()) {
			this.sweep = this.max(this.sweep,this.canvas.height);
			}
		},

	processQueueAll: function() {
		this.processQueueN(999999999);
		this.sweep = this.max(this.sweep,this.canvas.height);
		this.draw();
		},

	processUpTo: function(y) {
		let event;
		while (!this.queueIsEmpty()) {
			event = this.queuePeek();
			if (event.y > y) {break;}
			this.processQueueOne();
			}
		// dont go backward
		this.sweep = this.max(this.sweep,y);
		// empty queue if sweep line is no longer visible
		if (this.sweep > this.canvas.height) {
			this.processQueueN(999999999);
			}
		},

	getBisector: function(va,vb) {
		let r = {x:(va.x+vb.x)/2,y:(va.y+vb.y)/2};
		if (vb.y==va.y) {return r;}
		r.m = (va.x-vb.x)/(vb.y-va.y);
		r.b = r.y-r.m*r.x;
		return r;
		},

	// connect a dangling edge
	// false: couldn't be connected
	// true: could be connected
	connectEdge: function(edge) {
		let vb = edge.vb;
		if (!!vb) {return true;}
		let va = edge.va;
		let xl = this.bbox.xl;
		let xr = this.bbox.xr;
		let yt = this.bbox.yt;
		let yb = this.bbox.yb;

		// get the line formula of bisector
		let lSite = edge.lSite;
		let rSite = edge.rSite;
		let f = this.getBisector(lSite,rSite);

		// find the best side of the bounding box to use to determine start point

		// vertical line
		if (f.m === undefined) {
			// doesn't intersect
			if (f.x < xl || f.x >= xr) {return false;}
			// downward
			if (lSite.x > rSite.x) {
				if (va === undefined) {
					va = new this.Vertex(f.x,yt);
					}
				else if (va.y >= yb) {
					return false;
					}
				vb = new this.Vertex(f.x,yb);
				}
			// upward
			else {
				if (va === undefined) {
					va = new this.Vertex(f.x,yb);
					}
				else if (va.y < yt) {
					return false;
					}
				vb = new this.Vertex(f.x,yt);
				}
			}
		// more horizontal
		else if (f.m < 1) {
			// rightward
			if (lSite.y < rSite.y) {
				if (va === undefined) {
					va = new this.Vertex(xl,f.m*xl+f.b);
					}
				else if (va.x >= xr) {
					return false;
					}
				vb = new this.Vertex(xr,f.m*xr+f.b);
				}
			// leftward
			else {
				if (va === undefined) {
					va = new this.Vertex(xr,f.m*xr+f.b);
					}
				else if (va.x < xl) {
					return false;
					}
				vb = new this.Vertex(xl,f.m*xl+f.b);
				}
			}
		// more vertical
		else {
			// downward
			if (lSite.x > rSite.x) {
				if (va === undefined) {
					va = new this.Vertex((yt-f.b)/f.m,yt);
					}
				else if (va.y >= yb) {
					return false;
					}
				vb = new this.Vertex((yb-f.b)/f.m,yb);
				}
			// upward
			else {
				if (va === undefined) {
					va = new this.Vertex((yb-f.b)/f.m,yb);
					}
				else if (va.y < yt) {
					return false;
					}
				vb = new this.Vertex((yt-f.b)/f.m,yt);
				}
			}

		edge.va = va;
		edge.vb = vb;
		return true;
		},

	// line-clipping
	clipEdge: function(edge) {
		// no dangling edge
		let ax = edge.va.x;
		let ay = edge.va.y;
		let bx = edge.vb.x;
		let by = edge.vb.y;
		let t0 = 0;
		let t1 = 1;
		let dx = bx-ax;
		let dy = by-ay;
		// left
		let q = ax-this.bbox.xl;
		if (dx===0 && q<0) {return false;}
		let r = -q/dx;
		if (dx<0) {
			if (r<t0) {return false;}
			else if (r<t1) {t1=r;}
			}
		else if (dx>0) {
			if (r>t1) {return false;}
			else if (r>t0) {t0=r;}
			}
		// right
		q = this.bbox.xr-ax;
		if (dx===0 && q<0) {return false;}
		r = q/dx;
		if (dx<0) {
			if (r>t1) {return false;}
			else if (r>t0) {t0=r;}
			}
		else if (dx>0) {
			if (r<t0) {return false;}
			else if (r<t1) {t1=r;}
			}
		// top
		q = ay-this.bbox.yt;
		if (dy===0 && q<0) {return false;}
		r = -q/dy;
		if (dy<0) {
			if (r<t0) {return false;}
			else if (r<t1) {t1=r;}
			}
		else if (dy>0) {
			if (r>t1) {return false;}
			else if (r>t0) {t0=r;}
			}
		// bottom
		q = this.bbox.yb-ay;
		if (dy===0 && q<0) {return false;}
		r = q/dy;
		if (dy<0) {
			if (r>t1) {return false;}
			else if (r>t0) {t0=r;}
			}
		else if (dy>0) {
			if (r<t0) {return false;}
			else if (r<t1) {t1=r;}
			}
		// clip edge intersect
		edge.va.x = ax+t0*dx;
		edge.va.y = ay+t0*dy;
		edge.vb.x = ax+t1*dx;
		edge.vb.y = ay+t1*dy;
		return true;
		},

	clipEdges: function() {
		// connect all edges to bounding box
		let edges = this.edges;
		let nEdges = this.TOTAL_NUM_EDGES = edges.length;
		let edge;
		// iterate backward to splice
		for (let iEdge=nEdges-1; iEdge>=0; iEdge-=1) {
			edge = edges[iEdge];
			if (!this.connectEdge(edge) || !this.clipEdge(edge) || this.verticesAreEqual(edge.va,edge.vb)) {
				this.NUM_DESTROYED_EDGES++;
				this.destroyEdge(edge);
				edges.splice(iEdge,1);
				}
			}
		},

	verticesAreEqual: function(a,b) {
		return this.equalWithEpsilon(a.x,b.x) && this.equalWithEpsilon(a.y,b.y);
		},

	// sort halfedges counterclockwise
	sortHalfedgesCallback: function(a,b) {
		let ava = a.getStartpoint();
		let avb = a.getEndpoint();
		let bva = b.getStartpoint();
		let bvb = b.getEndpoint();
		return self.Math.atan2(bvb.y-bva.y,bvb.x-bva.x) - self.Math.atan2(avb.y-ava.y,avb.x-ava.x);
		},

	validateCells: function(cell) {
		let halfedges = cell.halfedges;
		let nHalfedges = halfedges.length;
		let halfedge;
		for (let iHalfedge=0; iHalfedge<nHalfedges; iHalfedge++) {
			halfedge = halfedges[iHalfedge];
			}
		},

	// Close the cells.
	closeCells: function() {
		if (this.cellsClosed) {return;}
		let xl = this.bbox.xl;
		let xr = this.bbox.xr;
		let yt = this.bbox.yt;
		let yb = this.bbox.yb;
		// clip edges
		this.clipEdges();
		// prune/order halfedges
		let cells = this.cells;
		let cell;
		let iLeft, iRight;
		let halfedges, nHalfedges;
		let edge;
		let startpoint, endpoint;
		let va, vb;
		for (let cellid in cells) {
			cell = cells[cellid];
			halfedges = cell.halfedges;
			iLeft = halfedges.length;
			// remove unused halfedges
			while (iLeft) {
				iRight = iLeft;
				while (iRight>0 && halfedges[iRight-1].isLineSegment()) {iRight--;}
				iLeft = iRight;
				while (iLeft>0 && !halfedges[iLeft-1].isLineSegment()) {iLeft--;}
				if (iLeft === iRight) {break;}
				halfedges.splice(iLeft,iRight-iLeft);
				}
			// remove cell if no halfedges
			if (halfedges.length === 0) {
				delete cells[cellid];
				continue;
				}
			// reorder segments
			halfedges.sort(this.sortHalfedgesCallback);
			// close open cells
			nHalfedges = halfedges.length;
			iLeft = 0;
			while (iLeft < nHalfedges) {
				iRight = (iLeft+1) % nHalfedges;
				endpoint = halfedges[iLeft].getEndpoint();
				startpoint = halfedges[iRight].getStartpoint();
				if (!this.verticesAreEqual(endpoint,startpoint)) {
					// cell needs to be closed by moving counterclockwise along the bounding box until it connects
					// to next halfedge in the list
					va = new this.Vertex(endpoint.x,endpoint.y);
					// downward along left side
					if (this.equalWithEpsilon(endpoint.x,xl) && this.lessThanWithEpsilon(endpoint.y,yb)) {
						vb = new this.Vertex(xl,this.equalWithEpsilon(startpoint.x,xl) ? startpoint.y : yb);
						}
					// rightward along bottom side
					else if (this.equalWithEpsilon(endpoint.y,yb) && this.lessThanWithEpsilon(endpoint.x,xr)) {
						vb = new this.Vertex(this.equalWithEpsilon(startpoint.y,yb) ? startpoint.x : xr,yb);
						}
					// upward along right side
					else if (this.equalWithEpsilon(endpoint.x,xr) && this.greaterThanWithEpsilon(endpoint.y,yt)) {
						vb = new this.Vertex(xr,this.equalWithEpsilon(startpoint.x,xr) ? startpoint.y : yt);
						}
					// leftward along top side
					else if (this.equalWithEpsilon(endpoint.y,yt) && this.greaterThanWithEpsilon(endpoint.x,xl)) {
						vb = new this.Vertex(this.equalWithEpsilon(startpoint.y,yt) ? startpoint.x : xl,yt);
						}
					edge = this.createBorderEdge(cell.site,va,vb);
					halfedges.splice(iLeft+1,0,new this.Halfedge(cell.site,edge));
					nHalfedges = halfedges.length;
					}
				iLeft++;
				}
			}
		this.cellsClosed = true;
		},

	getCells: function() {
		this.closeCells();
		return this.cells;
		},

	initCanvas: function() {
		if (this.canvas) {return;}
    
		let canvas = document.getElementById('fortuneCanvas');
    
		if (!canvas.getContext) {return;}
		let ctx = canvas.getContext('2d');
		if (!ctx) {return;}
		canvas.width = 800;
		canvas.height = 600;
		ctx.fillStyle='#fff';
		ctx.rect(0,0,canvas.width,canvas.height);
		ctx.fill();
		ctx.strokeStyle = '#888';
		ctx.stroke();
		this.canvas = canvas;

		// event handlers
		let me = this;
		canvas.onclick = function(e) {
			if (!e) {e=self.event;}
			let x = 0;
			let y = 0;
			if (e.pageX || e.pageY) {
				x = e.pageX;
				y = e.pageY;
				}
			else if (e.clientX || e.clientY) {
				x = e.clientX+document.body.scrollLeft+document.documentElement.scrollLeft;
				y = e.clientY+document.body.scrollTop+document.documentElement.scrollTop;
				}
			// -----
			me.addSite(x-this.offsetLeft,y-this.offsetTop);
			};
		},

	setCanvasSize: function(w,h) {
		if (this.isNaN(w) || this.isNaN(h)) {return;}
		this.canvas.width = this.max(Number(w),100);
		this.canvas.height = this.max(Number(h),100);
		this.bbox.xl = 0;
		this.bbox.xr = w;
		this.bbox.yt = 0;
		this.bbox.yb = h;
		this.canvasMargin = this.min(this.canvasMargin,w/4,h/4);
		this.draw();
		},

	setCanvasMargin: function(margin) {
		if (this.isNaN(margin) || margin < 0) {return;}
		this.canvasMargin = Number(margin);
		},

	draw: function() {
		let ctx = this.canvas.getContext('2d');
		this.drawBackground(ctx);
		this.drawSites(ctx);
		// sweep line
		if (this.sweep < this.canvas.height) {
			ctx.globalAlpha=0.9;
			ctx.strokeStyle='#00f';
			ctx.lineWidth=0.5;
			ctx.beginPath();
			ctx.moveTo(0,this.sweep);
			ctx.lineTo(this.canvas.width,this.sweep);
			ctx.stroke();
			}
		this.drawEdges(ctx);
		if (!this.queueIsEmpty()) {
			this.drawVertices(ctx);
			}
		if (this.sweep < this.canvas.height) {
			this.drawBeachline(ctx);
			}
		},

	drawBackground: function(ctx) {
		ctx.globalAlpha = 1;
		ctx.beginPath();
		ctx.rect(0,0,this.canvas.width,this.canvas.height);
		ctx.fillStyle = '#fff';
		ctx.fill();
		ctx.strokeStyle = '#888';
		ctx.stroke();
		},

	drawSites: function(ctx) {
		let queueIsEmpty = this.queueIsEmpty();
		ctx.beginPath();
		let nSites=this.sites.length;
		for (let iSite=0; iSite<nSites; iSite++){
			let site=this.sites[iSite];
			if (queueIsEmpty) {
				ctx.rect(site.x-0.25,site.y-0.25,1.5,1.5);
				}
			else {
				ctx.rect(site.x-0.5,site.y-0.5,2,2);
				}
			}
		ctx.globalAlpha = 1;
		ctx.fillStyle = '#000';
		ctx.fill();
		},

	drawCells: function() {
		let colvalues = '0123456789ABCDEF';
		let ctx = this.canvas.getContext('2d');
		let cells = this.getCells();
		if (!cells) {return;}
		let halfedges, nHalfedges, iHalfedge;
		let v;
		for (let cellid in cells) {
			halfedges = cells[cellid].halfedges;
			nHalfedges = halfedges.length;
			v = halfedges[0].getStartpoint();
			ctx.beginPath();
			ctx.moveTo(v.x,v.y);
			for (iHalfedge=0; iHalfedge<nHalfedges; iHalfedge++) {
				v = halfedges[iHalfedge].getEndpoint();
				ctx.lineTo(v.x,v.y);
				}
			ctx.fillStyle='#'+colvalues[(this.random()*16)&15]+colvalues[(this.random()*16)&15]+colvalues[(this.random()*16)&15];
			ctx.fill();
			}
		},

	drawBeachline: function(ctx) {
		// skip if no beach sections
		let nArcs=this.arcs.length;
		if (!nArcs) {return;}
		// prepare canvas drawing
		let cw = this.canvas.width;
		ctx.lineWidth = 1;
		// sweep line is parabolas' directrix
		let directrix = this.sweep;
		// prime left cut coordinates from left to right
		let arc = this.arcs[0];
		let xl = 0;
		let yl, xr, yr;
		let focx = arc.site.x;
		let focy = arc.site.y;
		let p;
		if (focy == directrix) {
			xl = focx;
			yl = 0;
			}
		else {
			p = (focy-directrix)/2;
			yl = (focx*focx)/(4*p)+focy-p;
			}
		// walk through all beach sections
		let neighbor;
		let ac_x, ac_y, bc_x, bc_y, gx, gy, n;
		let pi_by_2 = this.PI*2;
		for (let iArc=0; iArc<nArcs; iArc++) {
			arc = this.arcs[iArc];
			// site is parabola's focus
			focx=arc.site.x;
			focy=arc.site.y;
      // focus of the parabola is on the directrix
			if (focy == directrix) {
				xr = focx;
				// focus is on directrix, parabola is a vertical line.
				neighbor = iArc>0 ? this.arcs[iArc-1] : null;
				// degenerate neighbor
				if (!neighbor || neighbor.site.y == directrix) {
					neighbor = iArc < this.arcs.length-1 ? this.arcs[iArc+1] : null;
					}
				// both degenerate neighbors
				if (!neighbor || neighbor.site.y == directrix) {
					yr = 0;
					}
				// nice neighbor
				else {
					p = (neighbor.site.y-directrix)/2;
					yr = this.pow(focx-neighbor.site.x,2)/(4*p)+neighbor.site.y-p;
					}
				ctx.strokeStyle = '#080';
				ctx.beginPath();
				ctx.moveTo(focx,focy);
				ctx.lineTo(focx,yr);
				ctx.stroke();
				xl=xr;
				yl=yr;
				continue;
				}
			// find right cut point
			xr = this.min(this.rightBreakPoint(iArc,directrix),cw);
			p = (focy-directrix)/2;
			yr = this.pow(xr-focx,2)/(4*p)+focy-p;
			// draw only if beach section within sight
			if (xr >= 0 && xl < cw && xr > xl) {
				ac_x = focx-xl;
				ac_y = focy-directrix;
				bc_x = focx-xr;
				bc_y = focy-directrix;
				gx = (xr+focx)/2;
				gy = (directrix+focy)/2;
				n = ((gx-(xl+focx)/2)*ac_x+(gy-(directrix+focy)/2)*ac_y)/(bc_y*ac_x-bc_x*ac_y);
				ctx.beginPath();
				ctx.moveTo(xl,yl);
				ctx.quadraticCurveTo(gx-bc_y*n,gy+bc_x*n,xr,yr);
				ctx.stroke();
				}
			// current right cut become next iteration's left cut
			xl=xr;
			yl=yr;
			}
		},

	drawVertices: function(ctx) {
		ctx.beginPath();
		ctx.globalAlpha=1;
		let nEdges=this.edges.length;
		let edge;
		let va, vb;
		for (let iEdge=0; iEdge<nEdges; iEdge++) {
			edge=this.edges[iEdge];
			va = edge.va;
			if (va !== undefined) {
				ctx.rect(va.x-0.75,va.y-0.75,2.5,2.5);
				}
			vb = edge.vb;
			if (vb !== undefined) {
				ctx.rect(vb.x-0.75,vb.y-0.75,2.5,2.5);
				}
			}
		ctx.fillStyle='#07f';
		ctx.fill();
		},

	drawEdges: function(ctx) {
		ctx.beginPath();
		ctx.lineWidth=0.5;
		ctx.globalAlpha=1;
		let nEdges=this.edges.length;
		let edge;
		let va, vb;
		for (let iEdge=0; iEdge<nEdges; iEdge++) {
			edge=this.edges[iEdge];
			// skip dangling edges, they will be connected later
			if (edge.va === undefined || edge.vb === undefined) {continue;}
			va = edge.va;
			vb = edge.vb;
			ctx.moveTo(va.x,va.y);
			ctx.lineTo(vb.x,vb.y);
			}
		ctx.strokeStyle='#000';
		ctx.stroke();
	}
};

let VoronoiAnimateTimer;
let VoronoiAnimatePixels;
let VoronoiAnimateDelay;
function VoronoiAnimateCallback() {
	VoronoiAnimateTimer = undefined;
	Voronoi.processUpTo(Voronoi.sweep+VoronoiAnimatePixels);
	Voronoi.draw();
	if (!Voronoi.queueIsEmpty() || Voronoi.sweep < Voronoi.bbox.yb) {
		VoronoiAnimateTimer = setTimeout(VoronoiAnimateCallback,VoronoiAnimateDelay);
		}
	}
function VoronoiAnimate(px,ms) {
	if (VoronoiAnimateTimer !== undefined) {
		clearTimeout(VoronoiAnimateTimer);
		VoronoiAnimateTimer = undefined;
		}
	if (Voronoi.queueIsEmpty()) {
		Voronoi.reset();
		}
	// sanitize parameters
	VoronoiAnimatePixels = self.isNaN(px) ? 5 : Voronoi.max(px,1);
	// 10ms looks crazy but Chromium is lightning fast
	VoronoiAnimateDelay = self.isNaN(ms) ? 200 : Voronoi.max(ms,1);
	VoronoiAnimateTimer = setTimeout(VoronoiAnimateCallback,VoronoiAnimateDelay);
	}
function VoronoiAnimateStop() {
	if (VoronoiAnimateTimer !== undefined) {
		clearTimeout(VoronoiAnimateTimer);
		VoronoiAnimateTimer = undefined;
		}
	}