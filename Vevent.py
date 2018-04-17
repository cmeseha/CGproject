class Vevent:
	def __init__(self, point, eventType):
		self.point = point
		self.eventType = eventType
		self.y = self.point[1]
		self.x = self.point[0]
		self.arch = 0