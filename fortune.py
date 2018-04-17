from shapely.geometry import LineString
from parabola import *
from Vevent import *
from Vedge import *

import math
import heapq
import matplotlib.pyplot as plt

points = [[10, 11], [9, 2], [1, 6], [5, 4], [3, 7], [14, 13]]
# points = [[1,2]]
queue = []  # priority queue sorted by descending y coordinates of sites
root = None  # beach line tree

a = []
b = []

beachLineSites = []
beachLineParabY = []
beachLineParabX = []


def plotGraph(a, b):
    plt.plot(a, b, 'ro')
    plt.axis([0, 20, 0, 20])
    plt.show()


# def parabola(h, k, xCoordinates):
#   return [(x - h)**2 + k for x in xCoordinates]
# return [(k / h ** 2) * (x - h) ** 2 for x in xCoordinates]

# parabola using focus and directrix
# def parabolaD(a, b, c, xCoordinates):
#   return [(((x - a)**2 + b**2 - c**2)/(2*(b-c))) for x in xCoordinates]

# def plotParabs(beachLineX, beachLineY):
#   for i in range(0, len(beachLineX)):
#        plt.plot(beachLineX[i], beachLineY[i], '-')

# returns points where two parabolas intersect
def intersection(line1, line2):
    l1 = LineString(line1)
    l2 = LineString(line2)

    intersection = l1.intersection(l2)
    intersect_points = [list(p.coords)[0] for p in intersection]
    if not intersect_points:
        return 0
    else:
        return intersect_points


def intersect(point, aboveArc, newArc):
    if aboveArc.site[1] == point[1]:
        return

    if aboveArc.left:
        a = intersection(aboveArc.left.getPoints(), aboveArc.getPoints())
        aX = a[0][0]
    if aboveArc.right:
        b = intersection(aboveArc.getPoints(), aboveArc.right.getPoints())
        bX = a[0][0]
    if ((aboveArc.left is None) or (aX <= point[0])) and ((aboveArc.right == None) or (bX <= point[0])):
        newArc.pointsX = range(point[0] - 20, point[0] + 20)
        newArc.pointsY = newArc.parabolaD(aboveArc.site[0], aboveArc.site[1], point[1] - .5, newArc.pointsX)
        intersectPoints = intersection(newArc.getPoints(), aboveArc.getPoints())
        return intersectPoints[0]
    return


def checkCircleEvent(parabola, y):
    # check for old events
    if parabola.event and (parabola.site[1] != y):
        parabola.event.valid = False
    parabola.event = None

    # if can't have circle event return
    if (not parabola.left) or (not parabola.right):
        return

    # check circle and if so, add circle event to the queue
    circleData = circle(parabola.left.site, parabola.site, parabola.right.site)
    if (circleData and circleData[1] < y):
        parabola.event = Vevent(circleData[0], False, parabola)
        parabola.event.leastY = circleData[1]
        heapq.heappush(queue, (circleData[0][1], parabola.event))


def circle(a, b, c):
    # check for 90 degree turn between bc and ab
    if (b[0] - a[0]) * (c[1] - a[1]) - (c[0] - a[0]) * (b[1] - a[1]) > 0:
        return False

    A = b[0] - a[0]
    B = b[1] - a[1]
    C = c[0] - a[0]
    D = c[1] - a[1]
    E = A * (a[0] + b[0]) + B * (a[1] + b[1])
    F = C * (a[0] + c[0]) + D * (a[1] + c[1])
    G = 2 * (A * (c[1] - b[1]) - B * (c[0] - b[0]))

    # if g = 0, then points are collinear not circle
    if G == 0:
        return

    # get center point of circle
    center = (((D * E - B * F) / G), ((A * F - C * E) / G))

    # add radius of circle to get farthest Y from center to check for false alarms later
    # in which new site is found within circle
    leastY = center[1] - math.sqrt(((a[0] - center[0]) ** 2) + ((a[1] - center[1]) ** 2))
    return (center, leastY)



def addParabola(event):
    point = event.point
    parabola = Parabola(point, event, None, None)
    parabola.pointsX = range(point[0] - 20, point[0] + 20)
    parabola.pointsY = parabola.parabolaD(point[0], point[1], point[1] - .5, x)
    global root
    if root is None:
        root = parabola
        return

    # find current arc if any
    arcAbove = root
    while arcAbove is not None:
        inter1 = intersect(point, arcAbove, parabola)
        inter2 = ()
        if (inter1):
            inter2 = intersect(point, arcAbove.right, parabola)
            # duplicates the arcAbove if doesn't intersect
            if ((arcAbove.right != None) and (not inter2)):
                arcAbove.right.left = parabola(arcAbove.point, event, arcAbove, arcAbove.right)
                arcAbove.right = arcAbove.right.left
            else:
                arcAbove.right = parabola(arcAbove.point, event, arcAbove, None)

            arcAbove.right.vEdge1 = arcAbove.vEdge1

            # Add new arc between arc above and it's neighbor arc
            arcAbove.right.left = parabola(point, event, arcAbove, arcAbove.right)
            arcAbove.right = arcAbove.right.left

            # increment the while loop
            arcAbove = arcAbove.right

            # add half edges to Voronoi
            arcAbove.left.vEdge2 = Vedge(inter1)
            arcAbove.vEdge1 = Vedge(inter1)

            arcAbove.right.vEdge1 = Vedge(inter1)
            arcAbove.vEdge2 = Vedge(inter1)

            # Check for new circle events for new arc
            checkCircleEvent(arcAbove, point[1])
            checkCircleEvent(arcAbove.left, point[1])
            checkCircleEvent(arcAbove.right, point[1])

            return

    # if it doesn't intersect any arc on the beach line so far
    arcAbove = root
    while arcAbove.right is not None:
        arcAbove = arcAbove.right

    arcAbove.right = parabola(point, event, arcAbove, None)
    newEdgeStartY = 0
    newEdgeStartX = (arcAbove.right.site[0] + arcAbove.site[0]) / 2
    arcAbove.vEdge2 = Vedge((newEdgeStartX, newEdgeStartY))
    arcAbove.right.vEdge1 = Vedge((newEdgeStartX, newEdgeStartY))


def removeParabola(event):
    if event.valid:
        # make new edge which will replace two meeting edges
        newEdge = Vedge(event.point)

        # remove the disappearing parabola
        parabola = event.parab
        if parabola.left:
            parabola.left.right = parabola.left
            parabola.left.vEdge2 = newEdge
        if parabola.right:
            parabola.right.left = parabola.left
            parabola.right.vEdge1 = newEdge

        # cut the edges and update final points
        if parabola.vEdge1:
            parabola.vEdge1.endEdge(event.point)
        if parabola.vEdge2:
            parabola.vEdge2.endEdge(event.point)

        # check for circle events for two parabolas left after the removal if necessary
        if (parabola.left):
            checkCircleEvent(parabola.left, event.point[1])
        if (parabola.right):
            checkCircleEvent(parabola.right, event.point[1])

    del event


# for each unfinished edge, set their endpoints to the bounding box
def boundEdges():
    return


# plot all the sites, current Voronoi edges, current beachline, and current sweepline
# def plotGraph():
#     return


# for each point in the point cloud
for site in points:
    # create a site event
    # heappush uses siteEvent.y so I added a y attribute
    siteEvent = Vevent(site, True)
    print(siteEvent)

    # insert site event into queue
    heapq.heappush(queue, (siteEvent.point[1], siteEvent))
    a.append(site[0])
    b.append(site[1])
plotGraph(a, b)

while len(queue) != 0:
    heapq._heapify_max(queue)
    event = heapq._heappop_max(queue)
    print("\n")
    print(event[1])
    # beachLineParabX.clear()
    # beachLineParabY.clear()

    if event[1].eventType:  # site event
        # beachLineSites.append((event[1].x, event[0]))
        addParabola(event[1])
    else:  # circle event
        removeParabola(event.parab)

    # plot current beachline, voronoi diagram, and sweepline

    # update beach line (all other parabolas)

    """
    for site in beachLineSites: 
        x = range(site[0]-20, site[0] + 20)
        parab = parabolaD(site[0], site[1], event[0] - .5, x)
        beachLineParabY.append(parab)
        beachLineParabX.append(x)


    for i in range(0, len(beachLineX)):
        l1 = LineString5
    plt.plot(a, b, 'ro', x, parab, '-')
    plt.axhline(y=event[0], color='r', linestyle='-')    
    plotParabs(beachLineParabX, beachLineParabY)
    plt.axis([0, 20, 0, 20])
    plt.show()
    """
