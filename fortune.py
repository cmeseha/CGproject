
from parabola import *
from Vevent import *

import heapq
import matplotlib.pyplot as plt 


points = [[10, 11], [9, 2], [1, 6], [5, 4], [3, 7], [14, 13]]
#points = [[1,2]]
queue = [] # priority queue sorted by ascending y coordinates of sites
root = parabola(0) #beach line tree

a = []
b = []

beachLineSites = []
beachLineParabY = []
beachLineParabX = []

def plotGraph(a, b):
    plt.plot(a, b, 'ro')
    plt.axis([0, 20, 0, 20])
    plt.show()

def parabola(h, k, xCoordinates):
    return [(x - h)**2 + k for x in xCoordinates]
    #return [(k / h ** 2) * (x - h) ** 2 for x in xCoordinates]

#parabola using focus and directrix
def parabolaD(a, b, c, xCoordinates):
    return [(((x - a)**2 + b**2 - c**2)/(2*(b-c))) for x in xCoordinates]

def plotParabs(beachLineX, beachLineY):
    for i in range(0, len(beachLineX)):
        plt.plot(beachLineX[i], beachLineY[i], '-')

#for each point in the point cloud
for site in points:
        #create a site event
        siteEvent = Vevent(site, True)

    
        #insert site event into queue
        heapq.heappush(queue, (siteEvent.y, siteEvent))
        a.append(site[0])
        b.append(site[1])
plotGraph(a, b)

while (len(queue) != 0):
    heapq._heapify_max(queue)
    event = heapq._heappop_max(queue)
    beachLineSites.append((event[1].x, event[0]))
    beachLineParabX.clear()
    beachLineParabY.clear()
    if (event[1].eventType):
        print(event[0])
        
    
        #parab = parabola(event[1].x, event[0], x) 

        #plotGraph(a, b)
        #addParabola(event.point)
    else:
        #removeParabola(event.arch)
        print("shit")
    #update beach line (all other parabolas)
    for site in beachLineSites: 
        x = range(site[0]-20, site[0] + 20)
        parab = parabolaD(site[0], site[1], event[0] - .5, x)
        beachLineParabY.append(parab)
        beachLineParabX.append(x)
    plt.plot(a, b, 'ro', x, parab, '-')
    plt.axhline(y=event[0], color='r', linestyle='-')    
    plotParabs(beachLineParabX, beachLineParabY)
    plt.axis([0, 20, 0, 20])
    plt.show()
    #add Voronoi edges

    """
    text = raw_input("Press enter to continue")
    if text == "":
        keyPressed = True


    if keyPressed == True:
        event = heapq.heappop(queue)
        plt.plot(event[0])
        keyPressed = False
    """



"""
for x in range(-50, 50, 1):
        y = x*x
        a.append(x)
        b.append(y)


fig = plt.figure()
axes = fig.add_subplot(111)
axes.plot(a, b)
plt.show()
"""


"""
#if site event, add a parabola. if circle event, remove parabola
if (event.eventType):
    addParabola(event.point)
else:
    removeParabola(event.arch)
"""
    
"""
def addParabola(point):

    #get the arc that is above the site;
    parab = getParab(point.x)

    #if that parabola had a circle event, remove the circle event from the queue
    create 3 new arcs a,b,c and set their sites appropriately
    get the left and right edges from parab's site
        left edge = perpendicular line to a and b sites
        right edge = perpendicular line to b and c sites
    update the parabola tree (beach line)
    check for circle event for a
    check for circle event for b


#traverses the parabola beach line tree to find parabola above point
def getParab(x):
    parab = root
    while not parab.isLeaf:
        x = 

"""
"""

function removeParabola(parabola)
    leftArc = left arc
    rightArc = right arc
    Remove leftArc and rightArc circle events if they exists
    center = center of circle
    Create new edge that starts at center and perpendicular to the left arcs site point and the right arcs site point
    delete neighbor edges and replace with new edge
    Check for circle event for left arc
    check for cicle event for right arc


function checkCircleEvent(parabola)
   {
      leftArc = left arc
      rightArc = right arc
      get neighbor edges of p
      if there is no left arc, right arc, or the sites for each arc are the same, just RETURN
      center of circle = where edges cross
      calculate distance between center and the parabola's site = radius of circle
      if that distance + y of the center = under the sweep line, just return 
      otherwise, make new circle event
      set that circle events parabola to input parameter parabola
      set the y of the event
      add the event to the queue

   """