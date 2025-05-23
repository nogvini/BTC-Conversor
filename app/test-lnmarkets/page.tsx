"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { fetchLNMarketsTrades, fetchLNMarketsDeposits, fetchLNMarketsWithdrawals } from "@/lib/ln-markets-client";
import type { LNMarketsCredentials } from "@/components/types/ln-markets-types";

export default function TestLNMarketsPage() {
  const [credentials, setCredentials] = useState<LNMarketsCredentials>({
    apiKey: "",
    secret: "",
    passphrase: "",
    network: "testnet",
    isConfigured: true
  });

  const [results, setResults] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const testTrades = async () => {
    setLoading(true);
    try {
      const response = await fetchLNMarketsTrades(credentials);
      setResults({ type: 'trades', response });
    } catch (error) {
      setResults({ type: 'trades', error: error.message });
    } finally {
      setLoading(false);
    }
  };

  const testDeposits = async () => {
    setLoading(true);
    try {
      const response = await fetchLNMarketsDeposits(credentials);
      setResults({ type: 'deposits', response });
    } catch (error) {
      setResults({ type: 'deposits', error: error.message });
    } finally {
      setLoading(false);
    }
  };

  const testWithdrawals = async () => {
    setLoading(true);
    try {
      const response = await fetchLNMarketsWithdrawals(credentials);
      setResults({ type: 'withdrawals', response });
    } catch (error) {
      setResults({ type: 'withdrawals', error: error.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle>Teste LN Markets API</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="apiKey">API Key</Label>
              <Input
                id="apiKey"
                type="password"
                value={credentials.apiKey}
                onChange={(e) => setCredentials(prev => ({ ...prev, apiKey: e.target.value }))}
                placeholder="Cole sua API Key aqui"
              />
            </div>
            <div>
              <Label htmlFor="secret">Secret</Label>
              <Input
                id="secret"
                type="password"
                value={credentials.secret}
                onChange={(e) => setCredentials(prev => ({ ...prev, secret: e.target.value }))}
                placeholder="Cole seu Secret aqui"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="passphrase">Passphrase</Label>
              <Input
                id="passphrase"
                type="password"
                value={credentials.passphrase}
                onChange={(e) => setCredentials(prev => ({ ...prev, passphrase: e.target.value }))}
                placeholder="Cole sua Passphrase aqui"
              />
            </div>
            <div>
              <Label htmlFor="network">Network</Label>
              <Select 
                value={credentials.network} 
                onValueChange={(value: 'mainnet' | 'testnet') => 
                  setCredentials(prev => ({ ...prev, network: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="testnet">Testnet</SelectItem>
                  <SelectItem value="mainnet">Mainnet</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex gap-4">
            <Button onClick={testTrades} disabled={loading}>
              Testar Trades
            </Button>
            <Button onClick={testDeposits} disabled={loading}>
              Testar Depósitos
            </Button>
            <Button onClick={testWithdrawals} disabled={loading}>
              Testar Saques
            </Button>
          </div>

          {results && (
            <Card className="mt-4">
              <CardHeader>
                <CardTitle>Resultado: {results.type}</CardTitle>
              </CardHeader>
              <CardContent>
                <pre className="bg-gray-100 p-4 rounded overflow-auto text-sm">
                  {JSON.stringify(results, null, 2)}
                </pre>
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 