
# Defines VEvent data structure

# point   - the current Vpoint responsible for the event
# eventType - true if site event, false if circle event
# arch  - the arch above the event that occured (only necessary for site events)

   
class Vevent:
	def __init__(self, point, eventType):
		self.point = point
		self.eventType = eventType
		self.valid = True
