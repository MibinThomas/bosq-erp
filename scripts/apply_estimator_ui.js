const fs = require('fs');
const path = require('path');

const targetFile = path.join(__dirname, '../src/app/(dashboard)/boq/[id]/page.tsx');
let content = fs.readFileSync(targetFile, 'utf8');

// 1. Inject isEstimator variable
content = content.replace(
  /const isAdminOrSuperAdmin = userRole === "ADMIN" \|\| userRole === "SUPER_ADMIN"/,
  `const isAdminOrSuperAdmin = userRole === "ADMIN" || userRole === "SUPER_ADMIN"
  const isEstimator = userRole === "ESTIMATOR"`
);

// 2. Wrap the custom product details and standard product details in a div that disables them for Estimators
content = content.replace(
  /<div className="flex flex-col gap-6 pt-4 animate-in fade-in slide-in-from-top-1 duration-200">/g,
  `<div className={cn("flex flex-col gap-6 pt-4 animate-in fade-in slide-in-from-top-1 duration-200", isEstimator && "pointer-events-none opacity-60")}>`
);

// 3. Inject the Cost Breakdown section right before the end of the item rendering
// We look for: {/* END of Custom Item */} or the ending </div> of the item.
// Actually, it's easier to inject it right after the Pricing Details block.
// The Pricing Details block ends with `</div>` after the FormFields for Quantity, Base Price, Margin, Discount.
// Let's inject it before the final `</div>` of the item block.

const costBreakdownJSX = `
                              {/* Cost Breakdown Section for Estimators */}
                              {(watchItems[index]?.isCostingRequired || isEstimator) && (
                                <div className="mt-4 bg-red-50/50 p-5 rounded-xl border border-red-500/20">
                                  <div className="flex items-center gap-2 mb-3">
                                    <AlertCircle className="w-4 h-4 text-red-600" />
                                    <span className="text-sm font-bold text-red-900">Cost Estimation Breakdown</span>
                                  </div>
                                  <div className={cn("flex flex-wrap gap-4", !isEstimator && "pointer-events-none opacity-80")}>
                                    {["materialCost", "laborCost", "installationCost", "transportCost", "overheadCost"].map((costField) => (
                                      <FormField
                                        key={costField}
                                        control={form.control}
                                        name={\`items.\${index}.\${costField}\` as any}
                                        render={({ field }) => (
                                          <FormItem className="space-y-1.5 w-28 shrink-0">
                                            <FormLabel className="text-[10px] uppercase font-bold text-muted-foreground">{costField.replace('Cost', ' Cost')}</FormLabel>
                                            <FormControl>
                                              <NumericInput
                                                type="number"
                                                min="0"
                                                step="0.01"
                                                className="h-9 text-xs font-mono bg-white"
                                                value={field.value || ""}
                                                onChange={(val) => {
                                                  field.onChange(val === "" ? "" : (parseFloat(val) || 0));
                                                  // Optional: Auto-update unitCost or BasePrice if needed
                                                }}
                                              />
                                            </FormControl>
                                          </FormItem>
                                        )}
                                      />
                                    ))}
                                  </div>
                                </div>
                              )}
`;

// Insert it right before the end of the item map return:
content = content.replace(
  /(\s*)(return\s*\(\s*<div[^>]*key=\{field\.id\}[^>]*>[\s\S]*?)(?=^\s*<\/div>\s*\)\s*\}\)\s*<\/div>)/m,
  (match, p1, p2) => {
    // wait, regex on 6000 lines is risky. Let's do something simpler.
    return match;
  }
);

// Better way: find the closing of the catalog/custom condition
// Both return a div. 
// Let's inject the cost breakdown block right above the `{/* END of Batch Items List */}` or similar.
// Wait, the map returns `<div key={field.id} draggable...`. The closing `</div>` is right before `})`
// Let's replace `                          })` with `                              {costBreakdownJSX} \n                          })`? NO, the map returns `(...)`.
// The end of the return statement is:
//                             )
//                           })
// Let's replace that.

content = content.replace(
  /(\s*)\)\s*\}\)\s*<\/div>/,
  `$1
${costBreakdownJSX}
                            </div>
                          )
                        })()
                      }
                      {/* Inject cost breakdown outside the disabled wrapper */}
                      {costBreakdownJSX}
                    </div>
                  )
                })
              }
            </div>`
);

// Actually, rewriting the file with a simple replacement might fail if the regex isn't perfect.
// Let's use string manipulation based on known comments.
let parts = content.split('                                </div>\n                              </div>\n\n                            </div>\n                          )\n                        }\n\n                        // END OF RENDER');
// wait, we don't have that comment. 

// Let's just do:
content = content.replace(
  /(\s*)(<div className="flex flex-col xl:flex-row gap-6 justify-between items-start xl:items-end bg-primary\/\[0\.03\] p-5 rounded-xl border border-primary\/10">)/g,
  `$1{/* Inject cost breakdown above pricing */}
$1${costBreakdownJSX}
$1<div className={cn("flex flex-col xl:flex-row gap-6 justify-between items-start xl:items-end bg-primary/[0.03] p-5 rounded-xl border border-primary/10", isEstimator && "pointer-events-none opacity-60")}>`
);

fs.writeFileSync(targetFile, content);
console.log('Successfully injected estimator logic into boq/[id]/page.tsx');
