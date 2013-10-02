
import json
import math
import pprint

def getStats():

    jsonStr = open("tests.json").read()
    jsonObj = json.loads(jsonStr)

    xMean = 0
    yMean = 0
    distMean = 0

    for userStat in jsonObj:
        xMean += (float(userStat["xMean"]) / len(jsonObj))
        yMean += (float(userStat["yMean"]) / len(jsonObj))
        distMean += (float(userStat["distMean"]) / len(jsonObj))

    xVar = 0
    yVar = 0
    distVar = 0

    for userStat in jsonObj:
        xVar += (pow(float(userStat["xMean"] - xMean), 2) / len(jsonObj))
        yVar += (pow(float(userStat["yMean"] - yMean), 2) / len(jsonObj))
        distVar += (pow(float(userStat["distMean"] - distMean), 2) / len(jsonObj))


    return {
            "xMean" : xMean,
            "yMean" : yMean,
            "distMean" :distMean,
            "xStd" : math.sqrt(xVar),
            "yStd" : math.sqrt(yVar),
            "distStd" : math.sqrt(distVar),
            "totalTrials" : len(jsonObj)
    }

if __name__ == "__main__":

    pprint.pprint(getStats())
