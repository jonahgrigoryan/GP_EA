import operator
import random
from deap import gp
from . import utils

pset = gp.PrimitiveSet("MAIN", 4)
pset.renameArguments(ARG0="EMA50", ARG1="EMA200", ARG2="RSI14", ARG3="ATR14")

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
# Terminals are now passed as arguments ARG0-ARG3 due to arity=4 in PrimitiveSet
# pset.addTerminal("EMA50", name="EMA50") # Replaced by ARG0
# pset.addTerminal("EMA200", name="EMA200") # Replaced by ARG1
# pset.addTerminal("RSI14", name="RSI14") # Replaced by ARG2
# pset.addTerminal("ATR14", name="ATR14") # Replaced by ARG3

pset.addEphemeralConstant("const", lambda: random.uniform(-1, 1))
