
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

keyPressed = False

def plotGraph(a, b):
    plt.plot(a, b, 'ro')
    plt.axis([0, 10, 0, 10])
    plt.show()


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
    event = heapq.heappop(queue)
    if (event[1].eventType):
        addParabola(event.point)
    else:
        removeParabola(event.arch)

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