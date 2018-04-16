

# class parabola:
# 	def __init__(self, point):
# 		self.site = point
# 		self.isLeaf = True
# 		self.circleEvent = 0
# 		self.edge = 0
# 		self.parent = 0
# 		self.left = None
# 		self.right = None


class Parabola:
    def __init__(self, site, event, left, right):
        self.site = site
        self.event = event
        self.pointsX = []
        self.pointsY = []
        self.left = left
        self.right = right
        self.vEdge1 = None
        self.vEdge2 = None

    def getPoints(self):
        points = []
        for i in range(0, len(self.pointsX)):
            point = (self.pointsX[i], self.pointsY[i])
            points.append(point)
        return points

    # parabola using focus and directrix

    def parabolaD(self, a, b, c, xCoordinates):
        return [(((x - a)**2 + b**2 - c**2)/(2*(b-c))) for x in xCoordinates]