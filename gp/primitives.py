import operator
import random
from deap import gp
from . import utils

pset = gp.PrimitiveSet("MAIN", 0)

# arithmetic
pset.addPrimitive(operator.add, 2)
pset.addPrimitive(operator.sub, 2)
pset.addPrimitive(operator.mul, 2)
pset.addPrimitive(utils.protected_div, 2)

# comparisons return bool
pset.addPrimitive(operator.gt, 2)
pset.addPrimitive(operator.lt, 2)

# conditional
pset.addPrimitive(utils.if_func, 3)

# terminals for indicators
pset.addTerminal("EMA50", name="EMA50")
pset.addTerminal("EMA200", name="EMA200")
pset.addTerminal("RSI14", name="RSI14")
pset.addTerminal("ATR14", name="ATR14")

pset.addEphemeralConstant("const", lambda: random.uniform(-1, 1))
