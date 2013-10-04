
import json
import math
import pprint
import sys

def getStats():

    jsonStr = open(sys.argv[1]).read()
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
            "xMean" : xMean / 113,
            "yMean" : yMean / 113,
            "distMean" : distMean / 113,
            "xStd" : math.sqrt(xVar) / 113,
            "yStd" : math.sqrt(yVar) / 113,
            "distStd" : math.sqrt(distVar) / 113,
            "totalTrials" : len(jsonObj)
    }

def getSampleStats():

    jsonStr = open(sys.argv[1]).read()
    jsonObj = json.loads(jsonStr)

    daMean = sum(jsonObj) / float(len(jsonObj))

    daStd = math.sqrt(
        sum(map(lambda daVal: pow(daVal - daMean, 2) / float(len(jsonObj)), jsonObj))
    )

    return {"mean" : daMean, "uncertainty" : daStd}

if __name__ == "__main__":

    pprint.pprint(getSampleStats())
