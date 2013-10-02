
import json

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

    return {
            "xMean" : xMean,
            "yMean" : yMean,
            "distMean" :distMean,
            "totalTrials" : len(jsonObj)
    }

if __name__ == "__main__":

    print getStats()
