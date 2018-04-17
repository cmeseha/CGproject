class Parabola:
    def __init__(self, point):
        self.site = point
        self.isLeaf = True
        self.circleEvent = 0
        self.edge = 0
        self.parent = 0
        self.left = None
        self.right = None